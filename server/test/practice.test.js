// Run with: npm test (node's built-in test runner; no API key, no network, no model calls).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { telnyxAnswer, telnyxVoiceFor } from '../src/telnyx.js';
import { parseVoiceList, pickVoice, markVoiceResult, resetVoiceHealth, DEFAULT_VOICES } from '../src/practice/voices.js';
import { parseDrillChoice, DRILLS } from '../src/practice/drills.js';
import { buildScenario, resetRecent } from '../src/practice/scenario.js';
import { computeStats } from '../src/practice/stats.js';
import { PracticeSession, RE, parseScore } from '../src/practice/session.js';
import { practiceAnswer, startPracticeCall, takePracticeSession, callerAllowed, registerPracticeRoutes } from '../src/practice/index.js';
import { memoryStore } from '../src/practice/store.js';
import { armDrill } from '../src/practice/armed.js';
import { actorSystem, scorecardRequest } from '../src/practice/prompts.js';

// A tiny seeded random so scenario tests are repeatable.
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// ---- receptionist path unchanged ----------------------------------------------------------------

test('receptionist TeXML is unchanged (voice, greeting, socket url, settings)', () => {
  const biz = { name: 'Acme Tile', voice: 'Telnyx.NaturalHD.hera' };
  const xml = telnyxAnswer(biz, 'https://biggify-receptionist.onrender.com', '', '+19415551111', '+19415552222');
  assert.match(xml, /url="wss:\/\/biggify-receptionist\.onrender\.com\/ws\?to=%2B19415551111&amp;from=%2B19415552222"/);
  assert.match(xml, /voice="Telnyx\.NaturalHD\.hera"/);
  assert.match(xml, /welcomeGreeting="Hi, thanks for calling Acme Tile\./);
  assert.match(xml, /welcomeGreetingInterruptible="none"/);
  assert.match(xml, /interruptible="speech"/);
  assert.doesNotMatch(xml, /practice/);
  assert.equal(telnyxVoiceFor(biz, 'Telnyx.NaturalHD.luna'), 'Telnyx.NaturalHD.luna');
  assert.equal(telnyxVoiceFor({ voice: 'en-US-Journey-O' }), 'Telnyx.Natural.abbie'); // config default
});

// ---- voices ------------------------------------------------------------------------------------

test('voice list: defaults have both genders, env override parses, junk falls back', () => {
  assert.ok(DEFAULT_VOICES.some((v) => v.gender === 'm'));
  assert.ok(DEFAULT_VOICES.some((v) => v.gender === 'f'));
  assert.deepEqual(parseVoiceList('Telnyx.NaturalHD.luna:f, Telnyx.NaturalHD.orion:male, bad:m, Telnyx.X.y'), [
    { id: 'Telnyx.NaturalHD.luna', gender: 'f' },
    { id: 'Telnyx.NaturalHD.orion', gender: 'm' },
  ]);
  assert.equal(parseVoiceList('nonsense'), DEFAULT_VOICES);
});

test('pickVoice: both genders come up, never the same voice twice in a row', () => {
  resetVoiceHealth();
  const rand = seeded(7);
  const seen = { m: 0, f: 0 };
  let last = null;
  for (let i = 0; i < 200; i++) {
    const v = pickVoice({ recent: last ? [last] : [], rand });
    seen[v.gender]++;
    assert.notEqual(v.id, last);
    last = v.id;
  }
  assert.ok(seen.m > 60 && seen.f > 60, JSON.stringify(seen));
});

test('a voice that stays silent is skipped once speaker events are known to work', () => {
  resetVoiceHealth();
  const voices = [{ id: 'Telnyx.A.one', gender: 'm' }, { id: 'Telnyx.A.two', gender: 'm' }];
  markVoiceResult('Telnyx.A.one', { spoke: false, sentText: true, seconds: 30 }); // not judged yet
  markVoiceResult('Telnyx.A.two', { spoke: true, sentText: true, seconds: 30 }); // events proven
  markVoiceResult('Telnyx.A.one', { spoke: false, sentText: true, seconds: 30 }); // now flagged
  for (let i = 0; i < 20; i++) assert.equal(pickVoice({ voices, rand: Math.random }).id, 'Telnyx.A.two');
  resetVoiceHealth();
});

// ---- drills ------------------------------------------------------------------------------------

test('parseDrillChoice understands numbers and names, and ignores normal talk', () => {
  assert.equal(parseDrillChoice('two'), 'objections');
  assert.equal(parseDrillChoice('Number 3.'), 'gatekeeper');
  assert.equal(parseDrillChoice("let's do 8"), 'voicemail');
  assert.equal(parseDrillChoice('the voicemail one'), 'voicemail');
  assert.equal(parseDrillChoice('Hot seat'), 'hotseat');
  assert.equal(parseDrillChoice('random'), 'random');
  assert.equal(parseDrillChoice('go for it'), null);
  assert.equal(parseDrillChoice('I have two trucks out today and a crew'), null);
  assert.equal(DRILLS.length, 8);
});

// ---- scenarios ---------------------------------------------------------------------------------

test('every drill builds a scenario whose speaker matches the voice gender', () => {
  resetRecent();
  const rand = seeded(42);
  for (const d of DRILLS) {
    for (const gender of ['m', 'f']) {
      const s = buildScenario({ gender, drillId: d.id, rand });
      assert.equal(s.drill, d.id);
      assert.equal(s.speaker.gender, gender);
      assert.ok(s.pickup && s.brief.includes(`Drill: ${d.name}.`));
      assert.ok(s.brief.includes('Your one true thing:'));
      assert.ok(!/\{first\}|\{biz\}|undefined|NaN/.test(s.brief + s.pickup), s.brief + s.pickup);
      if (d.gatekeeper) assert.notEqual(s.role, 'owner');
      if (!d.gatekeeper && !d.voicemail) assert.equal(s.owner, s.speaker);
      if (d.gauntlet) assert.ok(s.objections.length >= 4);
      const sys = actorSystem(s, { today: 'Monday' }).map((b) => b.text).join('\n');
      assert.ok(sys.includes(s.pickup));
      assert.ok(sys.includes(gender === 'm' ? 'male' : 'female'));
    }
  }
});

test('random scenarios vary from call to call', () => {
  resetRecent();
  const briefs = new Set();
  const drills = new Set();
  for (let i = 0; i < 12; i++) {
    const s = buildScenario({ gender: i % 2 ? 'm' : 'f' });
    briefs.add(s.brief);
    drills.add(s.drill);
  }
  assert.equal(briefs.size, 12);
  assert.ok(drills.size >= 4);
});

test('out-of-state prospects get the phone-call meeting in the brief', () => {
  resetRecent();
  const rand = seeded(3);
  let found = false;
  for (let i = 0; i < 60 && !found; i++) {
    const s = buildScenario({ gender: 'f', drillId: 'full', rand });
    if (s.biz.remote) {
      found = true;
      assert.match(s.brief, /phone call from your cell/);
      assert.match(scorecardRequest(s, { turns: [{ who: 'rep', text: 'hi' }], stats: computeStats([{ who: 'rep', text: 'hi' }]) }, { roundNo: 1 }), /out of state/);
    }
  }
  assert.ok(found);
});

// ---- stats -------------------------------------------------------------------------------------

test('computeStats measures talk share, times offered, number asked and banned lines', () => {
  const st = computeStats([
    { who: 'rep', text: "Hi, sorry, I know this is out of the blue. Do you have 30 seconds? I guarantee results." },
    { who: 'prospect', text: 'What?' },
    { who: 'rep', text: 'Would tomorrow at 10 am or Thursday at 2 pm be better?' },
    { who: 'prospect', text: 'Thursday.' },
    { who: 'rep', text: "Great. What's the best number to text the confirmation to?" },
  ]);
  assert.ok(st.repShare > 80);
  assert.equal(st.offeredTwoTimes, true);
  assert.equal(st.askedForNumber, true);
  assert.deepEqual(st.banned, ['out of the blue', 'do you have 30 seconds', 'guarantee']);
  assert.equal(st.questions, 3);
});
// ---- session commands (no model calls) -----------------------------------------------------------

function newSession(drillId = 'full') {
  resetRecent();
  const scenario = buildScenario({ gender: 'm', drillId });
  return new PracticeSession({ scenario, voice: { id: 'Telnyx.NaturalHD.orion', gender: 'm' } });
}

test('a call starts on the prospect: no brief, no coach, straight into the drill', () => {
  const s = newSession('full');
  assert.equal(s.phase, 'roleplay');
  assert.equal(s.greeting, s.scenario.pickup);
  assert.doesNotMatch(s.greeting, /practice|drill|coach|ready|one true thing|goal/i);
  assert.ok(!s.greeting.includes(s.scenario.trueThing));
});

test('the hidden escape: "time out" pauses for the coach, "resume" goes back in', async () => {
  const s = newSession('full');
  const out = await s.handleUtterance('Time out.');
  assert.equal(s.phase, 'coach');
  assert.match(out, /Coach here/);
  const back = await s.handleUtterance('resume');
  assert.equal(s.phase, 'roleplay');
  assert.match(back, /Back on the call/);
});

test('saying done ends the call from the coach, but questions about "done" do not', async () => {
  for (const t of ["I'm done.", 'Okay, bye.', 'That is all', 'done for today thanks', 'Goodbye']) {
    assert.ok(RE.done.test(` ${t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `), t);
  }
  for (const t of ['What should I have done differently?', 'Is it done?', 'how did i do', 'next one']) {
    assert.ok(!RE.done.test(` ${t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `), t);
  }
  const s = newSession();
  await s.handleUtterance('coach');
  await s.handleUtterance("I'm done.");
  assert.equal(s.ended, true);
});

test('"next" in the coach hangs up and points at the tab (the next drill is armed there)', async () => {
  const s = newSession();
  await s.handleUtterance('coach');
  const out = await s.handleUtterance('next one');
  assert.equal(s.ended, true);
  assert.match(out, /Sales drilling tab/);
});

test('the voicemail drill listens, then hangs up after he goes quiet (no coach on the phone)', async () => {
  const s = newSession('voicemail');
  assert.equal(s.phase, 'roleplay');
  assert.match(s.scenario.pickup, /Beep\.$/);
  // Without a message left, the idle nudge does nothing.
  assert.equal(await s.handleUtterance(s.idleToken), '');
  assert.equal(await s.handleUtterance("Hi Mike, it's Wyatt Brunderman with Biggify in Port Charlotte."), '');
  assert.ok(s.idleAfterMs() > 0);
  assert.equal(await s.handleUtterance(s.idleToken), '');
  assert.equal(s.ended, true);
  assert.equal(s.runs.length, 1);
  assert.equal(s.runs[0].run.outcome, 'voicemail');
  assert.equal(s.runs[0].scorecard, '');
});

test('restart during a run starts the same prospect over with just their pickup line', async () => {
  const s = newSession('full');
  const id = s.scenario.id;
  s.run.turns.push({ who: 'rep', text: 'hi' });
  const out = await s.handleUtterance('start over');
  assert.equal(s.scenario.id, id);
  assert.equal(s.run.turns.length, 0);
  assert.equal(out, s.scenario.pickup);
});

test('hanging up mid-call keeps the run for scoring; parseScore reads the last score', () => {
  const s = newSession('full');
  s.run.turns.push({ who: 'rep', text: 'Hi Mike, Wyatt with Biggify.' }, { who: 'prospect', text: 'Yeah?' });
  s.closeOpenRun();
  assert.equal(s.runs.length, 1);
  assert.equal(s.runs[0].run.outcome, 'rep_hung_up');
  assert.equal(parseScore('Score: 6 out of 10. Actually, Score: 5 out of 10.'), 5);
  assert.equal(parseScore('no score'), null);
});

// ---- the endpoint ------------------------------------------------------------------------------

test('practice TeXML: the armed prospect picks up, in the armed voice, with nothing read out', async () => {
  resetRecent();
  const store = memoryStore();
  const armed = await armDrill(store, { mode: 'drill', drill: 'gatekeeper' });
  const call = await startPracticeCall({ from: '+19415550000', publicUrl: 'https://biggify-receptionist.onrender.com', store });
  assert.equal(call.drillRowId, armed.id);
  assert.match(call.xml, /url="wss:\/\/biggify-receptionist\.onrender\.com\/ws\?practice=[0-9a-f-]{36}"/);
  assert.match(call.xml, new RegExp(`voice="${armed.voice.id.replace(/\./g, '\.')}"`));
  const greeting = /welcomeGreeting="([^"]*)"/.exec(call.xml)[1];
  assert.equal(greeting, call.scenario.pickup.replace(/'/g, '&apos;').replace(/&(?!apos;)/g, '&amp;'));
  assert.doesNotMatch(call.xml, /Cold call practice|Drill:|Say ready|one true thing|Goal:/);
  assert.ok(!call.xml.includes(armed.scenario.trueThing));
  assert.match(call.xml, /events="speaker-events"/);
  assert.equal(call.scenario.speaker.gender, call.voice.gender);
  assert.equal((await store.get(armed.id)).status, 'live');
  assert.equal(await store.getArmed(), null);
  const session = takePracticeSession(call.id);
  assert.ok(session?.isPractice);
  assert.equal(session.phase, 'roleplay');
  assert.equal(takePracticeSession(call.id), null); // only once
  assert.match(practiceAnswer('', { voice: { id: 'Telnyx.NaturalHD.luna' }, greeting: 'a & b', id: 'x' }), /welcomeGreeting="a &amp; b"/);
});

test('PRACTICE_ALLOWED_CALLERS limits who can use the line', () => {
  delete process.env.PRACTICE_ALLOWED_CALLERS;
  assert.equal(callerAllowed('+19415550000'), true);
  process.env.PRACTICE_ALLOWED_CALLERS = '(941) 555-1234, +12065550000';
  assert.equal(callerAllowed('+19415551234'), true);
  assert.equal(callerAllowed('+19415550000'), false);
  delete process.env.PRACTICE_ALLOWED_CALLERS;
});

test('POST /practice-call-telnyx answers with TeXML', async () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  registerPracticeRoutes(app, { store: memoryStore() });
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/practice-call-telnyx`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'From=%2B19415550000&To=%2B19416463030',
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /xml/);
    const body = await res.text();
    assert.match(body, /<ConversationRelay url="ws:\/\/localhost:\d+\/ws\?practice=|<ConversationRelay url="wss?:\/\/[^"]+\/ws\?practice=/);
    assert.doesNotMatch(body, /Cold call practice/);
  } finally {
    server.close();
  }
});
