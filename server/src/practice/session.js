// One phone call to the cold-call practice line.
//
// The call starts silently: the armed prospect (Hubert's "Sales drilling" tab) has already picked up with
// their own line ("Hello, Smith Plumbing, this is Mike"), and nobody reads a brief. Wyatt read it on the
// tab before he dialed.
//
// Phases:
//   roleplay  the prospect (the actor model) is on the line. This is the whole call, normally: when the
//             scene ends (a meeting, a hang-up, a message taken...) the prospect says a last line and the
//             call hangs up like a real one. The scorecard is written after the call and saved for the tab.
//   coach     only reached through the hidden escape ("coach", "time out"): spoken feedback so far, then
//             "resume", "again" (same prospect from the top), questions, or "done". Never announced.
//   over      the scene ended; the call is hanging up.
// Commands are matched in code (instant, no model call). Only the prospect, the coach and the scorecards
// use the model.

import { DIFFICULTIES } from './scenario.js';
import { DRILL_BY_ID } from './drills.js';
import { actorSystem, END_SCENE_TOOL, coachSystem, scorecardRequest, COACH_TOOLS, COACH_CHAT_NOTE, runFacts } from './prompts.js';
import { practiceModels, streamReply } from './model.js';
import { computeStats } from './stats.js';
import { forSpeech } from '../claude.js';

const MAX_MINUTES = Number(process.env.PRACTICE_MAX_MINUTES) || 30;
export const IDLE_TOKEN = '__practice_idle__';
// The voicemail drill: once he has been quiet this long after speaking, the message is over.
const VOICEMAIL_QUIET_MS = 5000;
// The prospect may not end the scene before the rep's second line (2026-11-13: two calls in a row ended on the
// prospect's first reply). Only a tough prospect hanging up on a bad opener, or the rep saying goodbye, ends it sooner.
const MIN_REP_TURNS_TO_END = 2;
// The actor sometimes forgets who it is and talks as the caller ("No, this is Wyatt with Biggify..."). Such a
// sentence is never spoken; the reply is asked for again with a reminder.
const ROLE_BREAK = /\b(this is|it'?s|i'?m|i am|my name is|name'?s) wyatt\b|\b(i'?m|i am|we'?re|we are)( \w+)? (with|from|calling from) biggify\b|\bi'?m calling (about|because|from|to)\b|\bthe reason i'?m calling\b/i;
export const roleBreak = (t) => ROLE_BREAK.test(String(t || ''));

const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const norm = (t) => ` ${String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

export const RE = {
  safeWord: / (coach|time out|timeout|feedback|how did i do|pause|pause it) /,
  menu: / (menu|list|options|other drills?|different drill|pick a drill|change (the )?drill) /,
  restart: / (start over|restart|from the top|redo|do over|reset) /,
  again: / (again|same (one|prospect|call|drill|guy|lady|person)|retry|redo|run it back|one more time|try (it|that) again) /,
  next: / (next|new (one|prospect|call|person)|another|different (one|prospect|person)|next one|give me another|keep going with a new) /,
  resume: / (resume|keep going|continue|back in|back to (the|it)|pick (it|up) (back )?up|carry on) /,
  // Ending the drill from inside the call: whole short replies only, never words a rep says to a prospect.
  quit: /^ (i'm done|im done|i am done|end the drill|end drill|end practice|stop the drill) $/,
  // Only a whole short reply means "stop" ("I'm done", "okay, bye"): "what should I have done?" must not hang up.
  done: /^ ((ok|okay|alright|all right|yeah|cool|great) )?(done|all done|i'm done|im done|i am done|i'm finished|im finished|finished|that's all|thats all|that is all|that's it|thats it|goodbye|bye|bye bye|hang up|end the call|end call|quit|stop|i'm good|im good|that's enough|thats enough)( for (now|today))?( thanks| thank you)? $/,
};

export const NEXT_ON_TAB = 'Okay. Hang up and call back when you\'re ready. The next one is on your Sales drilling tab.';

function todayFor(tz) {
  const zone = { Pacific: 'America/Los_Angeles', 'Arizona (Mountain)': 'America/Phoenix', Central: 'America/Chicago' }[tz] || 'America/New_York';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', hour12: true }).format(new Date()).replace(/, (\d+ [AP]M)$/, ', around $1');
  } catch {
    return '';
  }
}

// "Score: 7 out of 10." The last one wins, in case the coach corrected itself.
export function parseScore(scorecard = '') {
  const all = [...String(scorecard).matchAll(/score:?\s*(\d{1,2})\s*(out of|\/)\s*10/gi)];
  return all.length ? Math.min(10, Number(all[all.length - 1][1])) : null;
}

export class PracticeSession {
  /**
   * @param {object} o
   * @param {object} o.scenario   the armed scenario (see scenario.js)
   * @param {{id:string, gender:string}} o.voice
   * @param {string} [o.from]     the caller's number (for the log only)
   * @param {string} [o.greeting] what Telnyx speaks when the call connects: the prospect's own pickup line
   * @param {string|null} [o.drillRowId] the practice_drills row this call took (null when nothing could be saved)
   * @param {object|null} [o.drillRow]   that row (sticky drill, difficulty target)
   */
  constructor({ scenario, voice, from = '', greeting = '', drillRowId = null, drillRow = null, reply = streamReply }) {
    this.reply = reply;
    this.isPractice = true;
    this.voice = voice;
    this.gender = voice.gender;
    this.from = from;
    this.drillRowId = drillRowId;
    this.drillRow = drillRow;
    this.startedAt = Date.now();
    this.greeting = greeting || scenario.pickup;
    this.ended = false;
    this.difficultyTarget = Number.isInteger(drillRow?.difficulty_target) ? drillRow.difficulty_target : Math.max(0, DIFFICULTIES.indexOf(scenario.difficulty));
    this.runs = []; // finished runs: { scenario, run, scorecard, score, paused, endedAt }
    this.agentSpoke = false; // Telnyx said the voice played (voice health check)
    this.sentText = false;
    this.coachMessages = [];
    this.pausedRun = null;
    this.idleMs = 0;
    this.#setScenario(scenario);
    // The prospect already answered (the welcome greeting): the call is the drill from the first word.
    this.#startRun();
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
    if (this.ended) return '';
    const t = norm(text);
    const short = wordCount(text) <= 6;

    if (Date.now() - this.startedAt > MAX_MINUTES * 60_000 && this.phase !== 'roleplay') {
      say(`That's ${MAX_MINUTES} minutes. Nice work. Talk soon.`);
      this.ended = true;
      return spoken.join(' ');
    }

    if (text === IDLE_TOKEN) {
      // Voicemail: he stopped talking, so the message is left. Hang up like a real voicemail would.
      if (this.phase === 'roleplay' && DRILL_BY_ID[this.scenario.drill].voicemail && this.run.turns.length) this.#closeRun('voicemail', '');
      return spoken.join(' ');
    }

    if (this.phase === 'roleplay') {
      // The hidden escape: stop the call and hear the coach. Never announced on the call.
      if (short && RE.safeWord.test(t)) {
        await this.#pauseRun(say, signal);
        return spoken.join(' ');
      }
      if (RE.quit.test(t)) {
        this.#closeRun('rep_ended', 'Wyatt ended the drill himself');
        return spoken.join(' ');
      }
      if (short && RE.restart.test(t)) {
        this.#setScenario(this.scenario);
        this.#startRun();
        say(this.scenario.pickup);
        return spoken.join(' ');
      }
      return this.#roleplayTurn(text, say, spoken, signal);
    }

    // coach (only after the hidden escape)
    if (RE.done.test(t)) {
      say('Good work. Talk soon.');
      this.ended = true;
      return spoken.join(' ');
    }
    if (short && RE.resume.test(t) && this.pausedRun) {
      this.#resume(say);
      return spoken.join(' ');
    }
    if (short && RE.again.test(t)) {
      this.#rerun(say);
      return spoken.join(' ');
    }
    if (short && (RE.next.test(t) || RE.menu.test(t))) {
      say(NEXT_ON_TAB);
      this.ended = true;
      return spoken.join(' ');
    }
    await this.#coachChat(text, say, signal);
    return spoken.join(' ');
  }

  // ---- runs ------------------------------------------------------------------------------------

  #startRun() {
    this.phase = 'roleplay';
    this.run.startedAt = Date.now();
  }

  // The same prospect again, from their pickup line. A paused run that was never resumed is kept as it was.
  #rerun(say) {
    this.#keepPaused();
    this.#setScenario({ ...this.scenario });
    this.#startRun();
    say(this.scenario.pickup);
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

  #keepPaused() {
    if (!this.pausedRun) return;
    const { scenario, run } = this.pausedRun;
    if (run.turns.some((x) => x.who === 'rep')) {
      this.runs.push({ scenario, run: { ...run, turns: [...run.turns], outcome: 'paused', note: 'paused with the coach and never resumed', stats: computeStats(run.turns) }, scorecard: '', score: null, paused: true, endedAt: new Date().toISOString() });
    }
    this.pausedRun = null;
  }

  async #roleplayTurn(text, say, spoken, signal) {
    const drill = DRILL_BY_ID[this.scenario.drill];
    this.run.turns.push({ who: 'rep', text });
    const repTurns = this.run.turns.filter((x) => x.who === 'rep').length;

    if (drill.voicemail) {
      // The voicemail just listens. When he has been quiet for a few seconds, the socket sends IDLE_TOKEN.
      this.idleMs = VOICEMAIL_QUIET_MS;
      if (repTurns >= drill.maxRepTurns) this.#closeRun('voicemail', '');
      return spoken.join(' ');
    }

    // Keep the actor history alternating even if a reply was cut off before any words.
    const last = this.actorMessages[this.actorMessages.length - 1];
    if (last?.role === 'user' && typeof last.content === 'string') last.content += ` ${text}`;
    else this.actorMessages.push({ role: 'user', content: text });

    let reply;
    let line = '';
    // The drill's last line (opener reps stop after his third line): the prospect wraps up instead of asking him
    // something he never gets to answer.
    const lastLine = (drill.endAfterRepTurns && repTurns >= drill.endAfterRepTurns) || repTurns >= drill.maxRepTurns;
    const wrapNote = lastLine ? '\n\n(Note from the line, not spoken by the caller: this is your last line on this call. Answer him in one short line and wrap the call up naturally, the way this person would ("Alright, send me something." / "I gotta go, call me later." / "Not interested, take care."). Do not ask him a question.)' : '';
    const me = `${this.scenario.speaker.first}${this.scenario.role === 'owner' ? `, the owner of ${this.scenario.biz.name}` : ` at ${this.scenario.biz.name}`}`;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let broke = false;
        const lastUser = this.actorMessages[this.actorMessages.length - 1].content;
        const messages = attempt === 0 ? (wrapNote ? [...this.actorMessages.slice(0, -1), { role: 'user', content: `${lastUser}${wrapNote}` }] : this.actorMessages) : [
          ...this.actorMessages.slice(0, -1),
          { role: 'user', content: `${lastUser}${wrapNote}

(Note from the line, not spoken by the caller: you are ${me}, the person who ANSWERED the phone. The caller is the salesman. Never introduce yourself as him or his company. Reply as ${this.scenario.speaker.first}.)` },
        ];
        reply = await this.reply({
          model: practiceModels.actor,
          system: actorSystem(this.scenario, { today: todayFor(this.scenario.biz.tz) }),
          messages,
          tools: [END_SCENE_TOOL],
          maxTokens: 1000,
          onSentence: (s) => {
            if (broke || roleBreak(s)) {
              broke = true;
              return;
            }
            line += `${s} `;
            say(s);
          },
          signal,
        });
        if (!broke && roleBreak(reply.text)) broke = true;
        if (!broke) break;
        console.warn('[practice] actor spoke as the caller; asking again:', String(reply.text).slice(0, 160));
        if (attempt === 1) {
          // Still confused: keep only what it said in character, or a plain confused line.
          if (!line.trim()) say('Sorry, who is this?');
          reply = { ...reply, text: line.trim() || 'Sorry, who is this?', message: { ...reply.message, content: [] } };
        } else if (line.trim()) {
          // Part of it was already spoken in character: keep that and stop here.
          reply = { ...reply, text: line.trim(), message: { ...reply.message, content: [] } };
          break;
        }
      }
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

    const content = reply.message?.content || [];
    let endTool = content.find((b) => b.type === 'tool_use' && b.name === 'end_scene');
    const said = (line.trim() || reply.text || '').trim();
    if (endTool && !this.#mayEnd(endTool.input?.outcome, text, repTurns, said)) {
      console.warn(`[practice] end_scene ignored (rep line ${repTurns}, outcome ${endTool.input?.outcome}): ${said.slice(0, 120)}`);
      endTool = null;
    }
    // Only text goes into the history: the scene is over when end_scene is called, so the tool call
    // never needs a result.
    const prospectLine = (line.trim() || reply.text) || (endTool ? 'Alright. Bye.' : '');
    if (!reply.text && prospectLine) say(prospectLine);
    if (prospectLine) {
      this.actorMessages.push({ role: 'assistant', content: prospectLine });
      this.run.turns.push({ who: 'prospect', text: prospectLine });
    }

    if (endTool) {
      this.#closeRun(endTool.input?.outcome || 'other', endTool.input?.note || '');
    } else if ((drill.endAfterRepTurns && repTurns >= drill.endAfterRepTurns) || repTurns >= drill.maxRepTurns) {
      this.#closeRun(drill.endAfterRepTurns ? 'other' : 'turns', 'the drill ran out of turns');
    }
    return spoken.join(' ');
  }

  // Is the actor allowed to end the scene now? Not on a question (the rep has to be able to answer it), and not
  // before the rep's second line unless he said goodbye or a tough prospect hung up on him.
  #mayEnd(outcome, repText, repTurns, line) {
    if (/\b(bye|goodbye|take care|have a good (one|day|night))\b/i.test(repText)) return true;
    if (/\?\s*$/.test(line)) return false;
    if (repTurns >= MIN_REP_TURNS_TO_END) return true;
    return this.scenario.difficulty === 'tough' && outcome === 'hung_up';
  }

  // The scene is over: the prospect's last line plays and the call hangs up, like a real call. No coach
  // and no score on the phone; finishPracticeSession scores it after the call for Hubert's tab and the email.
  #closeRun(outcome, note) {
    this.idleMs = 0;
    this.run.outcome = outcome;
    this.run.note = note;
    this.run.stats = computeStats(this.run.turns);
    this.runs.push({ scenario: this.scenario, run: { ...this.run, turns: [...this.run.turns] }, scorecard: '', score: null, paused: false, endedAt: new Date().toISOString() });
    this.phase = 'over';
    this.ended = true;
  }

  // The socket closed. A run he was still in (he hung up first) is kept with what was said.
  closeOpenRun() {
    if (this.phase === 'roleplay' && this.run.turns.some((x) => x.who === 'rep')) this.#closeRun('rep_hung_up', 'Wyatt hung up before the scene ended');
    this.#keepPaused();
  }

  // The hidden escape: quick spoken feedback so far, without giving away anything hidden.
  async #pauseRun(say, signal) {
    this.idleMs = 0;
    this.run.stats = computeStats(this.run.turns);
    this.phase = 'coach';
    this.pausedRun = { scenario: this.scenario, actorMessages: this.actorMessages, run: this.run };
    say('Okay, pausing the call. Coach here.');
    if (!this.run.turns.some((x) => x.who === 'rep')) {
      say('You haven\'t said anything yet, so nothing to go on. Say resume to go back in.');
      return;
    }
    let feedback = '';
    try {
      const res = await streamReply({
        model: practiceModels.coach,
        system: coachSystem(),
        messages: [{ role: 'user', content: scorecardRequest(this.scenario, this.run, { roundNo: this.runs.length + 1, paused: true }) }],
        maxTokens: 2000,
        onSentence: (s) => say(s),
        signal,
      });
      feedback = res.text;
    } catch (err) {
      if (signal?.aborted) return;
      console.error('[practice] paused feedback failed:', err.message);
    }
    if (!feedback && !signal?.aborted) say('Sorry, I couldn\'t pull that together.');
    this.coachMessages = [
      { role: 'user', content: `${runFacts(this.scenario, this.run)}\n\nYou gave him this spoken feedback so far: "${feedback}"\n\n${COACH_CHAT_NOTE}\nThe call is only paused and he may resume it: never reveal the hidden details, the pains or what would make them say yes.` },
      { role: 'assistant', content: 'Got it.' },
    ];
    say('Say resume to pick the call back up, again to start over, or ask me anything.');
  }

  async #coachChat(text, say, signal) {
    if (!this.coachMessages.length) {
      say('Say resume to go back in, or done to hang up.');
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
      if (!res.text) say('Good work. Talk soon.');
      this.ended = true;
    } else if (tool.name === 'resume_run' && this.pausedRun) {
      this.#resume(say);
    } else if (tool.name === 'next_run') {
      if (tool.input?.mode === 'same') this.#rerun(say);
      else {
        say(NEXT_ON_TAB);
        this.ended = true;
      }
    }
  }

  // ---- after the call --------------------------------------------------------------------------

  // Write the scorecard for every run that has none yet (runs end without a spoken score now).
  async scoreRuns({ timeoutMs = 60_000, score = defaultScorer } = {}) {
    const todo = this.runs.filter((r) => r.score === null && !r.scorecard && r.run.turns.some((x) => x.who === 'rep'));
    await Promise.all(todo.map(async (r) => {
      try {
        r.scorecard = await score(r, { roundNo: this.runs.indexOf(r) + 1, timeoutMs });
        r.score = parseScore(r.scorecard);
      } catch (err) {
        console.error('[practice] scorecard failed:', err.message);
      }
    }));
  }

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

async function defaultScorer(r, { roundNo, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await streamReply({
      model: practiceModels.coach,
      system: coachSystem(),
      messages: [{ role: 'user', content: scorecardRequest(r.scenario, r.run, { roundNo, paused: false }) }],
      maxTokens: 2000,
      signal: controller.signal,
    });
    return res.text;
  } finally {
    clearTimeout(timer);
  }
}
