// Hubert's "Sales drilling" tab <-> the practice line: arming, the shared-secret API, the silent start,
// saving results, auto-arming the next drill, and the hidden traits staying hidden until the call is over.
// Run with: npm test (no API key, no network, no model calls: scorecards come from a fake scorer).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { memoryStore } from '../src/practice/store.js';
import { armDrill, autoArmAfterCall, publicDrill, resultView, nextTarget } from '../src/practice/armed.js';
import { registerPracticeApi, authorized, practiceState, resetApiFailures } from '../src/practice/api.js';
import { startPracticeCall, takePracticeSession, finishPracticeSession, saveSessionResults } from '../src/practice/index.js';
import { resetRecent } from '../src/practice/scenario.js';
import { DRILLS } from '../src/practice/drills.js';

const SECRET = 'test-secret-0123456789-abcdefghij';

beforeEach(() => {
  resetRecent();
  resetApiFailures();
  process.env.PRACTICE_API_SECRET = SECRET;
  process.env.PRACTICE_REPORT_EMAIL = 'off';
});

// Every hidden string in a scenario: none may appear in anything Hubert gets before the call.
function hiddenStrings(s) {
  return [
    s.situation,
    ...s.pains,
    s.yesKey,
    s.trueThingPain,
    s.personalityHow,
    s.gatekeeperHow,
    s.pickup,
    ...s.objections.map((o) => o.line),
    s.decider ? `through ${s.decider}` : '',
  ].filter((x) => x && x.length > 6);
}

const fakeScorer = (score) => async () => `Score: ${score} out of 10. You opened well. Next time ask about referrals.`;

// ---- arming ------------------------------------------------------------------------------------

test('one armed drill at a time: arming again replaces the old one', async () => {
  const store = memoryStore();
  const a = await armDrill(store, { mode: 'random' });
  const b = await armDrill(store, { mode: 'drill', drill: 'objections' });
  assert.equal((await store.getArmed()).id, b.id);
  assert.equal((await store.get(a.id)).status, 'replaced');
  assert.equal(b.drill, 'objections');
  assert.equal(b.sticky_drill, 'objections');
  assert.equal(store._rows.filter((r) => r.status === 'armed').length, 1);
  assert.equal(b.scenario.speaker.gender, b.voice.gender);
});

test('easier and harder move one step and keep the drill; rerun copies the last prospect', async () => {
  const store = memoryStore();
  await armDrill(store, { mode: 'drill', drill: 'discovery' });
  const armed = await store.getArmed();
  const tough = armed.difficulty === 'tough';
  const moved = await armDrill(store, { mode: tough ? 'easier' : 'harder' });
  assert.equal(moved.drill, 'discovery');
  assert.notEqual(moved.difficulty, armed.difficulty);
  // Can't go past the ends.
  await armDrill(store, { mode: 'harder' }).catch(() => {});
  await armDrill(store, { mode: 'harder' }).catch(() => {});
  await assert.rejects(armDrill(store, { mode: 'harder' }), /already on tough/);
  await assert.rejects(armDrill(store, { mode: 'rerun' }), /no finished drill/);
  await assert.rejects(armDrill(store, { mode: 'drill', drill: 'nope' }), /unknown drill/);
  await assert.rejects(armDrill(store, { mode: 'bogus' }), /unknown mode/);

  const done = await store.insert({ ...(await store.getArmed()), id: undefined, status: 'done', score: 6 });
  const rerun = await armDrill(store, { mode: 'rerun' });
  assert.deepEqual(rerun.scenario, done.scenario);
  assert.deepEqual(rerun.voice, done.voice);
  assert.equal(rerun.rerun_of, done.id);
  assert.equal(rerun.source, 'rerun');
});

test('difficulty follows the score', () => {
  assert.equal(nextTarget(1, 9), 2);
  assert.equal(nextTarget(1, 3), 0);
  assert.equal(nextTarget(1, 6), 1);
  assert.equal(nextTarget(2, 10), 2);
  assert.equal(nextTarget(0, null), 0);
});

// ---- hidden traits ------------------------------------------------------------------------------

test('the armed brief never carries the hidden traits, for every drill', async () => {
  const store = memoryStore();
  for (const d of DRILLS) {
    for (let i = 0; i < 3; i++) {
      const row = await armDrill(store, { mode: 'drill', drill: d.id });
      const state = await practiceState(store);
      const json = JSON.stringify(state.armed);
      for (const h of hiddenStrings(row.scenario)) assert.ok(!json.includes(h), `${d.id}: leaked "${h}"`);
      for (const key of ['situation', 'pains', 'yesKey', 'objections', 'personality', 'pickup', 'voice', 'decider', 'scenario', 'turns', 'scorecard', 'priceTwice', 'asksDoesItWork']) {
        assert.ok(!(key in state.armed), `${d.id}: has ${key}`);
      }
      // The v3 practice habits (asks the price twice, asks "does it work?") are hidden: no trace in the brief beyond
      // the drill's own rubric, which is the same for every prospect.
      const { drill: _drill, ...perProspect } = state.armed;
      assert.doesNotMatch(JSON.stringify(perProspect), /how much|ballpark|does this stuff|actually work|twice|price/i);
      // The compliment is public, like the true thing.
      assert.equal(state.armed.compliment, row.scenario.compliment);
      assert.ok(state.armed.compliment.length > 10);
      assert.ok(!json.includes(row.voice.id));
      // What he does need is there.
      assert.equal(state.armed.business, row.scenario.biz.name);
      assert.equal(state.armed.owner.first, row.scenario.owner.first);
      assert.equal(state.armed.trueThing, row.scenario.trueThing);
      assert.equal(state.armed.drill.id, d.id);
    }
  }
});

test('a drill on the phone right now is shown without the hidden traits too; the reveal comes when it is done', async () => {
  const store = memoryStore();
  const row = await armDrill(store, { mode: 'drill', drill: 'full' });
  const call = await startPracticeCall({ store });
  let state = await practiceState(store);
  assert.equal(state.live.length, 1);
  const liveJson = JSON.stringify(state.live);
  for (const h of hiddenStrings(row.scenario)) assert.ok(!liveJson.includes(h), `leaked "${h}"`);
  assert.equal(state.recent.length, 0);

  const session = takePracticeSession(call.id);
  session.run.turns.push({ who: 'rep', text: "Hi, it's Wyatt Brunderman with Biggify." }, { who: 'prospect', text: 'Okay, what is it?' });
  await finishPracticeSession(session, { store, score: fakeScorer(7) });
  state = await practiceState(store);
  assert.equal(state.live.length, 0);
  const [done] = state.recent;
  assert.equal(done.id, row.id);
  assert.equal(done.result.score, 7);
  assert.match(done.result.scorecard, /^Score: 7 out of 10/);
  assert.equal(done.result.revealed.situation, row.scenario.situation);
  assert.deepEqual(done.result.revealed.pains, row.scenario.pains);
  assert.equal(done.result.transcript[0].text, row.scenario.pickup);
  assert.equal(done.result.transcript[1].who, 'rep');
  assert.equal(done.result.outcome, 'rep_hung_up');
});

// ---- the call ----------------------------------------------------------------------------------

test('silent start: the first thing said on the call is the prospect, not a brief', async () => {
  const store = memoryStore();
  for (const d of DRILLS) {
    await armDrill(store, { mode: 'drill', drill: d.id });
    const call = await startPracticeCall({ store });
    const session = takePracticeSession(call.id);
    assert.equal(session.greeting, call.scenario.pickup);
    assert.equal(session.phase, 'roleplay');
    for (const bit of ['Cold call practice', 'Drill:', 'Your one true thing', 'Goal:', 'Say ready', 'menu', 'coach', call.scenario.trueThing]) {
      assert.ok(!session.greeting.includes(bit), `${d.id}: greeting has "${bit}"`);
    }
    if (d.gatekeeper) assert.notEqual(call.scenario.role, 'owner');
    if (d.voicemail) assert.match(session.greeting, /Leave your name and number/);
    if (!d.gatekeeper && !d.voicemail) assert.ok(session.greeting.includes(call.scenario.speaker.first) || session.greeting.includes(call.scenario.biz.name) || session.greeting.length < 40);
  }
});

test('calling with nothing armed makes a drill on the spot, and it shows on the tab afterwards', async () => {
  const store = memoryStore();
  const call = await startPracticeCall({ store, from: '+19415551234' });
  assert.ok(call.drillRowId);
  const row = await store.get(call.drillRowId);
  assert.equal(row.status, 'live');
  assert.equal(row.source, 'call');
  assert.equal(row.caller_last4, '1234');
  const session = takePracticeSession(call.id);
  session.run.turns.push({ who: 'rep', text: 'Hi there, Wyatt with Biggify.' });
  await finishPracticeSession(session, { store, score: fakeScorer(5) });
  const state = await practiceState(store);
  assert.equal(state.recent[0].id, call.drillRowId);
  assert.equal(state.recent[0].source, 'call');
  assert.ok(state.armed, 'the next one is armed');
});

test('after a call the next drill is armed: same drill when he picked one, random otherwise, harder after a 9', async () => {
  const store = memoryStore();
  await armDrill(store, { mode: 'drill', drill: 'voicemail' });
  const armed = await store.getArmed();
  const call = await startPracticeCall({ store });
  const session = takePracticeSession(call.id);
  await session.handleUtterance("Hi Dave, it's Wyatt Brunderman with Biggify. I'll try you again Thursday. My number is 941-555-0100.");
  await session.handleUtterance(session.idleToken);
  assert.equal(session.ended, true);
  await finishPracticeSession(session, { store, score: fakeScorer(9) });

  const done = await store.get(armed.id);
  assert.equal(done.status, 'done');
  assert.equal(done.score, 9);
  assert.equal(done.next_target, Math.min(2, armed.difficulty_target + 1));
  const next = await store.getArmed();
  assert.ok(next && next.id !== armed.id);
  assert.equal(next.source, 'auto');
  assert.equal(next.drill, 'voicemail'); // sticky
  assert.equal(next.difficulty_target, done.next_target);

  // Random when he did not pick a drill.
  const r = await autoArmAfterCall(memoryStore(), { sticky_drill: null, next_target: 1 });
  assert.equal(r.sticky_drill, null);
});

test('auto-arm never replaces a drill he armed during the call', async () => {
  const store = memoryStore();
  await armDrill(store, { mode: 'drill', drill: 'full' });
  const call = await startPracticeCall({ store });
  const session = takePracticeSession(call.id);
  const mine = await armDrill(store, { mode: 'drill', drill: 'gatekeeper' }); // armed from the tab mid-call
  session.run.turns.push({ who: 'rep', text: 'Hello, Wyatt with Biggify.' });
  await finishPracticeSession(session, { store, score: fakeScorer(6) });
  assert.equal((await store.getArmed()).id, mine.id);
});

test('a call where he never spoke puts the same drill back as armed', async () => {
  const store = memoryStore();
  const armed = await armDrill(store, { mode: 'drill', drill: 'opener' });
  const call = await startPracticeCall({ store });
  const session = takePracticeSession(call.id);
  await finishPracticeSession(session, { store, score: fakeScorer(1) });
  assert.equal((await store.getArmed()).id, armed.id);
  assert.equal(store._rows.filter((r) => r.status === 'done').length, 0);
});

test('a re-run on the same call (coach, then again) saves as a second row', async () => {
  const store = memoryStore();
  await armDrill(store, { mode: 'drill', drill: 'full' });
  const call = await startPracticeCall({ store });
  const session = takePracticeSession(call.id);
  session.run.turns.push({ who: 'rep', text: 'Hi, sorry to bother you.' });
  session.runs.push({ scenario: session.scenario, run: { ...session.run, outcome: 'hung_up', stats: null }, scorecard: '', score: null, paused: false });
  session.run = { turns: [{ who: 'rep', text: "Hi Mike, it's Wyatt Brunderman." }], outcome: '', note: '', stats: null };
  session.phase = 'roleplay';
  await finishPracticeSession(session, { store, score: fakeScorer(8) });
  const done = store._rows.filter((r) => r.status === 'done');
  assert.equal(done.length, 2);
  assert.equal(done[1].source, 'rerun');
  assert.deepEqual(done[1].scenario, done[0].scenario);
});

test('saveSessionResults survives a call that could not be saved (no drill row)', async () => {
  const store = memoryStore();
  const call = await startPracticeCall({ store });
  const session = takePracticeSession(call.id);
  session.drillRowId = null;
  session.run.turns.push({ who: 'rep', text: 'Hi.' });
  session.closeOpenRun();
  await saveSessionResults(session, { store });
  assert.equal(store._rows.filter((r) => r.status === 'done').length, 1);
});

test('resultView only reveals finished drills', async () => {
  const store = memoryStore();
  const row = await armDrill(store, { mode: 'random' });
  assert.equal(resultView(row).result, null);
  assert.equal(publicDrill(null), null);
});

// ---- the API ------------------------------------------------------------------------------------

async function withApi(store, fn) {
  const app = express();
  app.use(express.json());
  registerPracticeApi(app, { store });
  const server = app.listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test('the API needs the shared secret', async () => {
  assert.equal(authorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(authorized(`Bearer ${SECRET}x`, SECRET), false);
  assert.equal(authorized(SECRET, SECRET), false);
  assert.equal(authorized('', SECRET), false);
  assert.equal(authorized(`Bearer ${SECRET}`, ''), false);

  await withApi(memoryStore(), async (base) => {
    let res = await fetch(`${base}/practice-api/state`);
    assert.equal(res.status, 401);
    res = await fetch(`${base}/practice-api/state`, { headers: { authorization: 'Bearer wrong-wrong-wrong-wrong-wrong' } });
    assert.equal(res.status, 401);
    res = await fetch(`${base}/practice-api/arm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"mode":"random"}' });
    assert.equal(res.status, 401);
    res = await fetch(`${base}/practice-api/state`, { headers: { authorization: `Bearer ${SECRET}` } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.equal(body.armed, null);
    assert.equal(body.drills.length, 8);
  });

  // Unset or too short: the API is off.
  process.env.PRACTICE_API_SECRET = 'short';
  await withApi(memoryStore(), async (base) => {
    const res = await fetch(`${base}/practice-api/state`, { headers: { authorization: 'Bearer short' } });
    assert.equal(res.status, 503);
  });
  delete process.env.PRACTICE_API_SECRET;
  await withApi(memoryStore(), async (base) => {
    assert.equal((await fetch(`${base}/practice-api/state`)).status, 503);
  });
});

test('too many wrong secrets in a minute are turned away', async () => {
  await withApi(memoryStore(), async (base) => {
    for (let i = 0; i < 10; i++) await fetch(`${base}/practice-api/state`, { headers: { authorization: 'Bearer nope' } });
    const res = await fetch(`${base}/practice-api/state`, { headers: { authorization: `Bearer ${SECRET}` } });
    assert.equal(res.status, 429);
  });
});

test('POST /practice-api/arm arms and answers with the state; bad input is a 400', async () => {
  const store = memoryStore();
  await withApi(store, async (base) => {
    const post = (body) => fetch(`${base}/practice-api/arm`, { method: 'POST', headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let res = await post({ mode: 'drill', drill: 'hotseat' });
    assert.equal(res.status, 200);
    const state = await res.json();
    assert.equal(state.armed.drill.id, 'hotseat');
    assert.equal(state.armed.sticky, true);
    const row = await store.getArmed();
    for (const h of hiddenStrings(row.scenario)) assert.ok(!JSON.stringify(state).includes(h), `leaked "${h}"`);
    res = await post({ mode: 'drill', drill: 'karate' });
    assert.equal(res.status, 400);
    res = await post({ mode: 'everything' });
    assert.equal(res.status, 400);
    res = await post({ mode: 'rerun' });
    assert.equal(res.status, 400);
  });
});
