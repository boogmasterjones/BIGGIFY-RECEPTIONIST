// Turn-taking and tone on the practice line (2026-11-16: "it interrupts me way too much, responds to things
// twice all the time, and has a fricken attitude").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TurnGate, isFillerOnly, soundsUnfinished } from '../src/practice/turns.js';
import { PracticeSession, OWED_TOKEN } from '../src/practice/session.js';
import { buildScenario, resetRecent } from '../src/practice/scenario.js';
import { actorSystem } from '../src/practice/prompts.js';
import { PERSONALITIES, GATEKEEPERS, OBJECTIONS } from '../src/practice/content.js';
import { DRILLS } from '../src/practice/drills.js';

// A clock we move by hand.
function fakeClock() {
  let now = 0;
  let id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimer: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; },
    clearTimer: (t) => { timers.delete(t); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at).find(([, t]) => t.at <= end);
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].fn();
      }
      now = end;
    },
  };
}

function gateWith(opts = {}) {
  const clock = fakeClock();
  const turns = [];
  const gate = new TurnGate({ onTurn: (text, o) => turns.push({ text, ...o }), waitMs: 1400, unfinishedWaitMs: 2600, ...clock, ...opts });
  return { gate, clock, turns };
}

test('pieces of one sentence (he pauses reading the script) become ONE turn, answered once', () => {
  const { gate, clock, turns } = gateWith();
  gate.add('Hey Mike, this is Wyatt with Biggify.');
  clock.advance(900);
  gate.add('The reason I\'m calling is your Google listing.');
  clock.advance(1000);
  assert.equal(turns.length, 0, 'never answers while the pieces keep coming');
  clock.advance(500);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].text, 'Hey Mike, this is Wyatt with Biggify. The reason I\'m calling is your Google listing.');
});

test('words that stop mid-thought get a longer wait before the prospect answers', () => {
  const { gate, clock, turns } = gateWith();
  gate.add('So the reason I\'m calling is because');
  clock.advance(1500);
  assert.equal(turns.length, 0);
  gate.add('you don\'t show up in the top three on Google Maps.');
  clock.advance(1400);
  assert.equal(turns.length, 1);
  assert.match(turns[0].text, /because you don't show up/);
  assert.equal(soundsUnfinished('I was looking at your listing and'), true);
  assert.equal(soundsUnfinished('Do you have a minute?'), false);
  assert.equal(soundsUnfinished('Thank you'), false);
});

test('a filler on its own ("um", "so") never makes the prospect answer; it joins what comes next', () => {
  const { gate, clock, turns } = gateWith();
  gate.add('Um.');
  clock.advance(5000);
  assert.equal(turns.length, 0);
  gate.add('Is this the owner?');
  clock.advance(1400);
  assert.deepEqual(turns.map((t) => t.text), ['Um. Is this the owner?']);
  assert.equal(isFillerOnly('so, um'), true);
  assert.equal(isFillerOnly('hello?'), false);
});

test('never answers while he is talking (speaker events), and waits again after he stops', () => {
  const { gate, clock, turns } = gateWith();
  gate.add('Hey, is this Jeff?');
  clock.advance(1000);
  gate.setSpeaking(true);
  clock.advance(5000);
  assert.equal(turns.length, 0);
  gate.setSpeaking(false);
  clock.advance(1300);
  assert.equal(turns.length, 0);
  gate.add('It\'s Wyatt.');
  clock.advance(1400);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].text, 'Hey, is this Jeff? It\'s Wyatt.');
});

test('the same transcript arriving twice counts once', () => {
  const { gate, clock, turns } = gateWith();
  gate.add('How are you doing today?');
  gate.add('How are you doing today?');
  clock.advance(1400);
  gate.add('How are you doing today?'); // a late repeat of the final, right after the turn went out
  clock.advance(3000);
  assert.deepEqual(turns.map((t) => t.text), ['How are you doing today?']);
});

test('a reply cancelled before a word was heard is owed: answered once he is quiet, even with no new words', () => {
  const { gate, clock, turns } = gateWith();
  gate.owe();
  clock.advance(1400);
  assert.deepEqual(turns, [{ text: '', owed: true }]);
  gate.close();
  gate.add('anything');
  clock.advance(5000);
  assert.equal(turns.length, 1);
});

// ---- the session: one turn of his, one reply ----------------------------------------------------

function fakeModel(replies) {
  const calls = [];
  const fn = async ({ messages, onSentence, signal }) => {
    calls.push(messages.map((m) => ({ ...m })));
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (r.abort) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    for (const s of r.text.split(/(?<=[.?!])\s+/).filter(Boolean)) {
      if (signal?.aborted) break;
      onSentence?.(s);
    }
    return { text: r.text, message: { content: [] } };
  };
  fn.calls = calls;
  return fn;
}

function session(replies, drillId = 'full') {
  resetRecent();
  const scenario = buildScenario({ gender: 'm', drillId });
  const reply = fakeModel(replies);
  return { s: new PracticeSession({ scenario, voice: { id: 'Telnyx.NaturalHD.orion', gender: 'm' }, reply }), reply };
}

test('more words after a reply was cancelled unheard are the SAME turn: one rep line, answered once', async () => {
  const { s, reply } = session([{ abort: true }, { text: 'Yeah, this is him. What\'s up?' }]);
  const ctl = new AbortController();
  ctl.abort();
  await s.handleUtterance('Hey, is this', null, ctl.signal);
  const out = await s.handleUtterance('the owner of the business?');
  assert.equal(out.trim(), 'Yeah, this is him. What\'s up?');
  const rep = s.run.turns.filter((t) => t.who === 'rep');
  assert.deepEqual(rep.map((t) => t.text), ['Hey, is this the owner of the business?']);
  assert.equal(s.run.turns.filter((t) => t.who === 'prospect').length, 1);
  // the model saw his words as one message
  const last = reply.calls.at(-1);
  assert.equal(last.filter((m) => m.role === 'user').length, 1);
  assert.match(last.at(-1).content, /Hey, is this the owner of the business\?/);
});

test('an owed turn is answered once; with nothing owed the token does nothing', async () => {
  const { s, reply } = session([{ abort: true }, { text: 'Who is this?' }]);
  const ctl = new AbortController();
  ctl.abort();
  await s.handleUtterance('Hi there, is Mike around?', null, ctl.signal);
  assert.equal(await s.handleUtterance(OWED_TOKEN), 'Who is this?');
  assert.equal(await s.handleUtterance(OWED_TOKEN), '');
  assert.equal(reply.calls.length, 2);
  assert.equal(s.run.turns.filter((t) => t.who === 'rep').length, 1);
});

test('the prospect never says the same sentence twice in a row', async () => {
  const { s } = session([{ text: 'I already have a guy for that.' }, { text: 'I already have a guy for that. He does fine.' }]);
  await s.handleUtterance('Do you get much work from Google?');
  const out = await s.handleUtterance('What does your guy do for you each month?');
  assert.equal(out.trim(), 'He does fine.');
  assert.equal(s.run.turns.at(-1).text, 'He does fine.');
});

test('a long-winded reply stops being spoken after about 40 words', async () => {
  const long = 'Well we have been doing this a long time. '.repeat(8).trim();
  const { s } = session([{ text: long }]);
  const out = await s.handleUtterance('How long have you been in business?');
  const words = out.trim().split(/\s+/).length;
  assert.ok(words <= 48, `${words} words`);
  assert.equal(s.run.turns.at(-1).text, out.trim());
});

// ---- tone ---------------------------------------------------------------------------------------

const RUDE = /sarcas|\byell(s|ed|ing)?\b|scream|irritat|annoyed by|cartoon villain|insult|cut them off|demand|grill|"son"|young man|prickly|short fuse|impatient|don't ever call|fed up|What do you want\?/i;

test('no prospect is told to be sarcastic, rude or hostile; every prompt carries the civility rule', () => {
  for (const [id, p] of Object.entries(PERSONALITIES)) assert.doesNotMatch(`${p.label} ${p.how}`, RUDE, id);
  for (const g of GATEKEEPERS) assert.doesNotMatch(g.how, RUDE, g.role);
  for (const [k, line] of Object.entries(OBJECTIONS)) assert.doesNotMatch(line, RUDE, k);
  for (const d of DRILLS) assert.doesNotMatch(d.actor, RUDE, d.id);
  for (const d of DRILLS) {
    if (d.voicemail) continue;
    resetRecent();
    const [rules, scene] = actorSystem(buildScenario({ gender: 'f', drillId: d.id })).map((b) => b.text);
    assert.match(rules, /never sarcastic, mocking, snarky, condescending, insulting or hostile/);
    assert.match(rules, /Never lecture him/);
    assert.doesNotMatch(rules, /cartoon villains|get a little impatient|short fuse/);
    assert.doesNotMatch(scene, RUDE, d.id);
  }
});

test('the prospect is told to keep it short and answer each thing once', () => {
  resetRecent();
  const rules = actorSystem(buildScenario({ gender: 'm', drillId: 'full' }))[0].text;
  assert.match(rules, /most replies are 3 to 12 words/);
  assert.match(rules, /never answer the same thing twice/);
  assert.match(rules, /You are NEVER the caller/);
  assert.match(rules, /Never end the call on your first reply/);
});

test('practice TeXML: no speechModel unless PRACTICE_SPEECH_MODEL is set', async () => {
  const { practiceAnswer } = await import('../src/practice/index.js');
  const voice = { id: 'Telnyx.Natural.abbie' };
  assert.doesNotMatch(practiceAnswer('', { voice, greeting: 'Hi', id: 'x', speechModel: '' }), /speechModel/);
  assert.match(practiceAnswer('', { voice, greeting: 'Hi', id: 'x', speechModel: 'flux' }), / speechModel="flux"/);
  assert.match(practiceAnswer('', { voice, greeting: 'Hi', id: 'x' }), /interruptible="speech"/);
});
