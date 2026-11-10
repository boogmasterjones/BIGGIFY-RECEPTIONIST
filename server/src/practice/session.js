// One phone call to the cold-call practice line.
//
// The call moves between four phases:
//   brief    the drill and the prospect were just described; "ready" dials, "menu" lists drills
//   menu     waiting for a drill number or name
//   roleplay the prospect (the actor model) is on the line
//   coach    the scorecard was given; "again", "next", "menu", "resume", "done", or a question
// Commands are matched in code (instant, no model call). Only the prospect, the scorecard and the
// coach's answers to questions use the model.

import { buildScenario, briefFor, DIFFICULTIES } from './scenario.js';
import { DRILL_BY_ID, MENU_TEXT, parseDrillChoice } from './drills.js';
import { actorSystem, END_SCENE_TOOL, coachSystem, scorecardRequest, COACH_TOOLS, COACH_CHAT_NOTE, runFacts } from './prompts.js';
import { practiceModels, streamReply } from './model.js';
import { computeStats } from './stats.js';
import { forSpeech } from '../claude.js';

const MAX_MINUTES = Number(process.env.PRACTICE_MAX_MINUTES) || 30;
export const IDLE_TOKEN = '__practice_idle__';

const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const norm = (t) => ` ${String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

export const RE = {
  safeWord: / (coach|time out|timeout|feedback|how did i do|pause|pause it) /,
  menu: / (menu|list|options|other drills?|different drill|pick a drill|change (the )?drill) /,
  ready: / (ready|go|dial|dial it|start|yes|yeah|yep|yup|ok|okay|sure|let's go|lets go|let's do it|alright|all right|call|ring|hit it|do it) /,
  repeat: / (repeat|say (that|it) again|again please|what was (that|the)|come again|one more time) /,
  restart: / (start over|restart|from the top|redo|do over|reset) /,
  again: / (again|same (one|prospect|call|drill|guy|lady|person)|retry|redo|run it back|one more time|try (it|that) again) /,
  next: / (next|new (one|prospect|call|person)|another|different (one|prospect|person)|next one|give me another|keep going with a new) /,
  resume: / (resume|keep going|continue|back in|back to (the|it)|pick (it|up) (back )?up|carry on) /,
  bail: /^ (menu|next|next one|skip|skip it|skip this one|new prospect|new one|i'm done|im done|i am done|end the drill|end drill) $/,
  // Only a whole short reply means "stop" ("I'm done", "okay, bye"): "what should I have done?" must not hang up.
  done: /^ ((ok|okay|alright|all right|yeah|cool|great) )?(done|all done|i'm done|im done|i am done|i'm finished|im finished|finished|that's all|thats all|that is all|that's it|thats it|goodbye|bye|bye bye|hang up|end the call|end call|quit|stop|i'm good|im good|that's enough|thats enough)( for (now|today))?( thanks| thank you)? $/,
};

function todayFor(tz) {
  const zone = { Pacific: 'America/Los_Angeles', 'Arizona (Mountain)': 'America/Phoenix', Central: 'America/Chicago' }[tz] || 'America/New_York';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', hour12: true }).format(new Date()).replace(/, (\d+ [AP]M)$/, ', around $1');
  } catch {
    return '';
  }
}

const BRIDGE = {
  meeting_booked: 'That\'s the call. You booked it.',
  callback_time: 'That\'s the call. You got a callback time.',
  put_through: 'That\'s the end of the drill. You got put through.',
  message_taken: 'That\'s the call. They took a message.',
  email_only: 'That\'s the call. They\'ll take an email.',
  hung_up: 'Click. They hung up.',
  not_interested: 'That\'s the call. They passed.',
  voicemail: 'That\'s your voicemail.',
  paused: 'Okay, pausing the call.',
  turns: 'Time\'s up on that one.',
  other: 'That\'s the end of the call.',
};

export class PracticeSession {
  /**
   * @param {object} o
   * @param {object} o.scenario  from buildScenario (already used for the greeting)
   * @param {{id:string, gender:string}} o.voice
   * @param {string} [o.from]    the caller's number (for the log only)
   * @param {string} [o.greeting] the welcome greeting Telnyx speaks
   */
  constructor({ scenario, voice, from = '', greeting = '' }) {
    this.isPractice = true;
    this.voice = voice;
    this.gender = voice.gender;
    this.from = from;
    this.startedAt = Date.now();
    this.greeting = greeting || `Cold call practice. ${scenario.brief}`;
    this.phase = 'brief';
    this.ended = false;
    this.difficultyTarget = DIFFICULTIES.indexOf(scenario.difficulty);
    this.runs = []; // finished runs: { scenario, run, scorecard, score }
    this.agentSpoke = false; // Telnyx said the voice played (voice health check)
    this.sentText = false;
    this.#setScenario(scenario);
    this.coachMessages = [];
    this.pausedRun = null;
    this.idleMs = 0;
  }

  #setScenario(s) {
    this.scenario = s;
    this.actorMessages = [];
    this.run = { turns: [], outcome: '', note: '', stats: null, startedAt: 0 };
  }

  noteAgentSpeaking() {
    this.agentSpoke = true;
  }

  // The socket asks after every reply: should it nudge us if the caller goes quiet? (voicemail drill)
  idleAfterMs() {
    return this.idleMs;
  }

  get idleToken() {
    return IDLE_TOKEN;
  }

  // The rep talked over the prospect: keep only what was heard of the prospect's last line.
  markInterrupted(heard) {
    if (this.phase !== 'roleplay') return;
    const last = this.actorMessages[this.actorMessages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (Array.isArray(last.content) && last.content.some((b) => b.type === 'tool_use')) return;
    const h = (heard || '').trim();
    this.actorMessages[this.actorMessages.length - 1] = { role: 'assistant', content: h ? `${h} (he cut you off here)` : '(he cut you off)' };
    const lastTurn = this.run.turns[this.run.turns.length - 1];
    if (lastTurn?.who === 'prospect' && h) lastTurn.text = `${h}…`;
  }

  async handleUtterance(text, onToken, signal) {
    const spoken = [];
    const say = (t) => {
      const s = forSpeech(t);
      if (!s) return;
      spoken.push(s);
      this.sentText = true;
      if (onToken) onToken(`${s} `);
    };
    this.idleMs = 0;
    const t = norm(text);
    const short = wordCount(text) <= 6;

    if (Date.now() - this.startedAt > MAX_MINUTES * 60_000 && this.phase !== 'roleplay') {
      say(`That's ${MAX_MINUTES} minutes, nice work today. Your scorecard is in your email. Talk soon.`);
      this.ended = true;
      return spoken.join(' ');
    }

    if (text === IDLE_TOKEN) {
      if (this.phase === 'roleplay' && DRILL_BY_ID[this.scenario.drill].voicemail && this.run.turns.length) {
        await this.#finishRun('voicemail', '', say, signal);
      }
      return spoken.join(' ');
    }

    if (this.phase !== 'roleplay' && RE.done.test(t)) {
      say(this.runs.length ? 'Good work. Your scorecard is in your email. Talk soon.' : 'Okay. Call back any time to practice.');
      this.ended = true;
      return spoken.join(' ');
    }

    if (this.phase === 'menu') {
      const choice = parseDrillChoice(text);
      if (!choice) {
        say('Which one? Say a number from one to eight, or say random.');
        return spoken.join(' ');
      }
      this.#newScenario(choice === 'random' ? '' : choice);
      say(this.scenario.brief);
      this.phase = 'brief';
      return spoken.join(' ');
    }

    if (this.phase === 'brief') {
      if (short && RE.menu.test(t)) {
        this.phase = 'menu';
        say(MENU_TEXT);
        return spoken.join(' ');
      }
      if (short && RE.repeat.test(t)) {
        say(this.scenario.brief);
        return spoken.join(' ');
      }
      const choice = short ? parseDrillChoice(text) : null;
      if (choice) {
        this.#newScenario(choice === 'random' ? '' : choice);
        say(this.scenario.brief);
        return spoken.join(' ');
      }
      if (short && (RE.ready.test(t) || !t.trim())) {
        this.#startRun();
        say(`Okay, dialing. ${this.scenario.pickup}`);
        return spoken.join(' ');
      }
      // He launched straight into his opener: the prospect already picked up.
      this.#startRun();
      return this.#roleplayTurn(text, say, spoken, signal);
    }

    if (this.phase === 'roleplay') {
      if (short && RE.safeWord.test(t)) {
        await this.#finishRun('paused', '', say, signal);
        return spoken.join(' ');
      }
      // Bailing out of a run: a bare "menu", "next", "skip" or "I'm done" (never words a rep says to a prospect).
      if (RE.bail.test(t)) {
        const cmd = t.trim();
        if (/^(i'm done|im done|i am done|end the drill|end drill)$/.test(cmd)) {
          say('Okay, stopping there. Good work today.');
          this.ended = true;
        } else if (/menu/.test(cmd)) {
          this.phase = 'menu';
          say(`Okay, dropping that one. ${MENU_TEXT}`);
        } else {
          this.#nextRun('', say);
        }
        return spoken.join(' ');
      }
      if (short && RE.restart.test(t)) {
        this.#setScenario(this.scenario);
        this.#startRun();
        say(`Okay, from the top. Dialing. ${this.scenario.pickup}`);
        return spoken.join(' ');
      }
      return this.#roleplayTurn(text, say, spoken, signal);
    }

    // coach
    if (short && RE.resume.test(t) && this.pausedRun) {
      this.#resume(say);
      return spoken.join(' ');
    }
    if (short && RE.menu.test(t)) {
      this.phase = 'menu';
      say(MENU_TEXT);
      return spoken.join(' ');
    }
    const choice = short ? parseDrillChoice(text) : null;
    if (short && RE.again.test(t) && !choice) {
      this.#rerun(say);
      return spoken.join(' ');
    }
    if (choice || (short && (RE.next.test(t) || /^ (yes|yeah|yep|sure|ok|okay|ready|let's go|go) $/.test(t)))) {
      this.#nextRun(choice && choice !== 'random' ? choice : '', say);
      return spoken.join(' ');
    }
    await this.#coachChat(text, say, signal);
    return spoken.join(' ');
  }

  // ---- runs ------------------------------------------------------------------------------------

  #newScenario(drillId) {
    const s = buildScenario({ gender: this.gender, drillId, difficulty: this.difficultyTarget, firstRound: false });
    this.#setScenario(s);
    this.pausedRun = null;
  }

  #startRun() {
    this.phase = 'roleplay';
    this.run.startedAt = Date.now();
    this.pausedRun = null;
  }

  #rerun(say) {
    this.#setScenario({ ...this.scenario });
    this.#startRun();
    say(`Same prospect, from the top. Dialing. ${this.scenario.pickup}`);
  }

  #nextRun(drillId, say) {
    this.#newScenario(drillId);
    this.phase = 'brief';
    say(this.scenario.brief);
  }

  #resume(say) {
    this.scenario = this.pausedRun.scenario;
    this.actorMessages = this.pausedRun.actorMessages;
    this.run = this.pausedRun.run;
    this.run.outcome = '';
    this.pausedRun = null;
    this.phase = 'roleplay';
    say('Back on the call. Go ahead.');
  }

  async #roleplayTurn(text, say, spoken, signal) {
    const drill = DRILL_BY_ID[this.scenario.drill];
    this.run.turns.push({ who: 'rep', text });
    const repTurns = this.run.turns.filter((x) => x.who === 'rep').length;

    if (drill.voicemail) {
      // The voicemail just listens. When he has been quiet for a few seconds, the socket sends IDLE_TOKEN.
      this.idleMs = 3500;
      if (repTurns >= drill.maxRepTurns) await this.#finishRun('voicemail', '', say, signal);
      return spoken.join(' ');
    }

    // Keep the actor history alternating even if a reply was cut off before any words.
    const last = this.actorMessages[this.actorMessages.length - 1];
    if (last?.role === 'user' && typeof last.content === 'string') last.content += ` ${text}`;
    else this.actorMessages.push({ role: 'user', content: text });

    let reply;
    let line = '';
    try {
      reply = await streamReply({
        model: practiceModels.actor,
        system: actorSystem(this.scenario, { today: todayFor(this.scenario.biz.tz) }),
        messages: this.actorMessages,
        tools: [END_SCENE_TOOL],
        maxTokens: 220,
        onSentence: (s) => {
          line += `${s} `;
          say(s);
        },
        signal,
      });
    } catch (err) {
      if (signal?.aborted || err?.name === 'APIUserAbortError' || err?.name === 'AbortError') {
        if (line.trim()) {
          this.actorMessages.push({ role: 'assistant', content: line.trim() });
          this.run.turns.push({ who: 'prospect', text: line.trim() });
        }
        return spoken.join(' ');
      }
      throw err;
    }
    if (signal?.aborted) return spoken.join(' ');

    const content = reply.message.content;
    const endTool = content.find((b) => b.type === 'tool_use' && b.name === 'end_scene');
    // Only text goes into the history: the scene is over when end_scene is called, so the tool call
    // never needs a result.
    const prospectLine = reply.text || (endTool ? 'Alright. Bye.' : '');
    if (!reply.text && prospectLine) say(prospectLine);
    if (prospectLine) {
      this.actorMessages.push({ role: 'assistant', content: prospectLine });
      this.run.turns.push({ who: 'prospect', text: prospectLine });
    }

    if (endTool) {
      await this.#finishRun(endTool.input?.outcome || 'other', endTool.input?.note || '', say, signal);
    } else if ((drill.endAfterRepTurns && repTurns >= drill.endAfterRepTurns) || repTurns >= drill.maxRepTurns) {
      await this.#finishRun(drill.endAfterRepTurns ? 'other' : 'turns', 'the drill ran out of turns', say, signal);
    }
    return spoken.join(' ');
  }

  async #finishRun(outcome, note, say, signal) {
    const paused = outcome === 'paused';
    this.idleMs = 0;
    this.run.outcome = paused ? '' : outcome;
    this.run.note = note;
    this.run.stats = computeStats(this.run.turns);
    this.phase = 'coach';
    say(`${BRIDGE[outcome] || BRIDGE.other} Coach here.`);

    if (!this.run.turns.some((x) => x.who === 'rep')) {
      say('You didn\'t say anything yet, so nothing to score.');
    } else {
      const roundNo = this.runs.length + 1;
      let scorecard = '';
      try {
        const res = await streamReply({
          model: practiceModels.coach,
          system: coachSystem(),
          messages: [{ role: 'user', content: scorecardRequest(this.scenario, this.run, { roundNo, paused }) }],
          maxTokens: 2000, // room for a little thinking on newer models; the spoken part is about 100 words
          onSentence: (s) => say(s),
          signal,
        });
        scorecard = res.text;
      } catch (err) {
        if (signal?.aborted) return;
        console.error('[practice] scorecard failed:', err.message);
        say('Sorry, I couldn\'t score that one.');
      }
      if (!scorecard && !signal?.aborted) say('Sorry, I couldn\'t score that one.');
      // The last "Score: N out of 10" wins, in case the coach corrected itself.
      const all = [...scorecard.matchAll(/score:?\s*(\d{1,2})\s*(out of|\/)\s*10/gi)];
      const score = all.length ? Math.min(10, Number(all[all.length - 1][1])) : null;
      const record = { scenario: this.scenario, run: { ...this.run, turns: [...this.run.turns] }, scorecard, score, paused };
      if (paused) {
        this.pausedRun = { scenario: this.scenario, actorMessages: this.actorMessages, run: this.run, record };
      }
      this.runs.push(record);
      // Next run: harder after a strong score, easier after a weak one.
      if (score !== null && !paused) {
        if (score >= 8) this.difficultyTarget = Math.min(2, this.difficultyTarget + 1);
        else if (score <= 4) this.difficultyTarget = Math.max(0, this.difficultyTarget - 1);
      }
      this.coachMessages = [
        { role: 'user', content: `${runFacts(this.scenario, this.run)}\n\nYou gave him this spoken ${paused ? 'feedback so far' : 'scorecard'}: "${scorecard}"\n\n${COACH_CHAT_NOTE}${paused ? '\nThe call is only paused and he may resume it: never reveal the hidden details, the pains or what would make them say yes.' : ''}` },
        { role: 'assistant', content: 'Got it.' },
      ];
    }
    const first = this.runs.length <= 1;
    const resume = this.pausedRun ? 'resume to pick the call back up, ' : '';
    say(first
      ? `Say ${resume}again to run the same prospect, next for a new one, or menu to pick a drill. Or ask me anything. Say done when you're finished.`
      : `Say ${resume}again, next, menu, or ask me something.`);
  }

  async #coachChat(text, say, signal) {
    if (!this.coachMessages.length) {
      say('Say next for a new prospect, or menu to pick a drill.');
      return;
    }
    this.coachMessages.push({ role: 'user', content: text });
    let res;
    try {
      res = await streamReply({
        model: practiceModels.coach,
        system: coachSystem(),
        messages: this.coachMessages,
        tools: COACH_TOOLS,
        maxTokens: 1500,
        onSentence: (s) => say(s),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) return;
      throw err;
    }
    const content = res.message.content;
    const tool = content.find((b) => b.type === 'tool_use');
    if (!res.text && !tool) say('Sorry, say that one more time?');
    // Keep the coach chat as plain text turns; tools act right away.
    this.coachMessages.push({ role: 'assistant', content: res.text || '(ok)' });
    if (!tool) return;
    if (tool.name === 'end_call') {
      if (!res.text) say('Good work. Your scorecard is in your email. Talk soon.');
      this.ended = true;
    } else if (tool.name === 'resume_run' && this.pausedRun) {
      this.#resume(say);
    } else if (tool.name === 'next_run') {
      const drill = tool.input?.drill && tool.input.drill !== 'random' ? tool.input.drill : '';
      if (tool.input?.mode === 'same' && !drill) this.#rerun(say);
      else this.#nextRun(drill, say);
    }
  }

  // ---- for the emailed report ------------------------------------------------------------------

  summary() {
    const scored = this.runs.filter((r) => r.score !== null);
    return {
      runs: this.runs.length,
      best: scored.length ? Math.max(...scored.map((r) => r.score)) : null,
      minutes: Math.round((Date.now() - this.startedAt) / 60000),
      voice: this.voice.id,
    };
  }
}

export { briefFor };
