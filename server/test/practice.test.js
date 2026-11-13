// Run with: npm test (node's built-in test runner; no API key, no network, no model calls).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { telnyxAnswer, telnyxVoiceFor } from '../src/telnyx.js';
import { parseVoiceList, pickVoice, markVoiceResult, resetVoiceHealth, DEFAULT_VOICES } from '../src/practice/voices.js';
import { parseDrillChoice, DRILLS } from '../src/practice/drills.js';
import { buildScenario, resetRecent } from '../src/practice/scenario.js';
import { computeStats, guaranteeProblem } from '../src/practice/stats.js';
import { PracticeSession, RE, parseScore } from '../src/practice/session.js';
import { practiceAnswer, startPracticeCall, takePracticeSession, callerAllowed, registerPracticeRoutes } from '../src/practice/index.js';
import { memoryStore } from '../src/practice/store.js';
import { armDrill } from '../src/practice/armed.js';
import { actorSystem, scorecardRequest, PLAYBOOK } from '../src/practice/prompts.js';

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
  assert.deepEqual(st.banned, ['out of the blue', 'do you have 30 seconds', 'the lead guarantee without its conditions']);
  assert.equal(st.questions, 3);
  // v3 asks for ONE specific time; "tomorrow at 10 am" counts.
  assert.equal(st.offeredOneTime, true);
});

// ---- cold-call script v3 -----------------------------------------------------------------------

const V3_OPENER = "Hi Mike, it's Wyatt Brunderman with Biggify, here in Port Charlotte. The reason I'm calling: I help trade businesses around here get more calls from Google, and I only take one plumber per town. I was looking at Dawson Plumbing. That truck wrap is sharp. And I noticed your Google listing shows no hours. That's one of the first things people compare when they're picking a plumber on their phone. Quick question: is getting more calls from Google something you're working on right now, or are you pretty full?";

test('v3 opener: "the reason I\'m calling", a because, and an easy question rather than a time grab', () => {
  const good = computeStats([{ who: 'rep', text: V3_OPENER }]);
  assert.equal(good.reasonInFirstLine, true);
  assert.equal(good.becauseInFirstLine, true);
  assert.equal(good.timeInFirstLine, false);
  assert.equal(good.questionInFirstLine, true);
  assert.deepEqual(good.banned, []);

  const grab = computeStats([{ who: 'rep', text: "Hi Mike, Wyatt Brunderman with Biggify. I noticed your hours are missing. I'd like to walk you through it. How about Thursday at 10?" }]);
  assert.equal(grab.reasonInFirstLine, false);
  assert.equal(grab.timeInFirstLine, true);
  assert.ok(grab.banned.includes('walk you through / show you / tell you about'));

  const seo = computeStats([{ who: 'rep', text: "Hi Mike, it's Wyatt with Biggify. The reason I'm calling is SEO for plumbers." }]);
  assert.ok(seo.banned.includes('SEO as an opener'));
});

test('v3 never-say list: the new phrases are caught, the old ones still are', () => {
  const lines = {
    'is this a good time': 'Is this a good time?',
    "what's a good time for you": "What's a good time for you?",
    'I understand': 'I understand, totally.',
    "it's a tax write-off": "Plus it's a tax write-off.",
    'best service and support': 'We give the best service and support.',
    'earn your business': "I'd love to earn your business.",
    'what do you like about your current…': 'What do you like about your current guy?',
    'mind if I check in': 'Mind if I check in next month?',
    'free consultation': "It's a free consultation.",
    'a free trial': 'You can have a free 30-day trial.',
    'how are you': 'Hey, how are you today?',
    "you're losing jobs": "You're losing jobs every week.",
    'we just helped a company like yours': 'We just helped a company like yours.',
    'a ranking promise': 'I can get you to number one.',
  };
  for (const [label, text] of Object.entries(lines)) {
    assert.ok(computeStats([{ who: 'rep', text }]).banned.includes(label), `${label}: "${text}"`);
  }
});

test('the guarantee is fine only with its conditions in the same breath; never results, rankings or money back', () => {
  const ok = 'On my second plan I put a lead number in writing. I guarantee it once your Google profile has 4 stars or better, 20 reviews, one in the last 90 days, and call tracking hooked up.';
  assert.equal(guaranteeProblem(ok), false);
  assert.deepEqual(computeStats([{ who: 'rep', text: ok }]).banned, []);
  for (const bad of ['I guarantee more calls.', 'Guaranteed results.', 'There is a lead guarantee in writing.', "It's money back if it doesn't work, 4 stars, 20 reviews, 90 days, call tracking."]) {
    assert.equal(guaranteeProblem(bad), true, bad);
  }
  // Conditions said in another turn do not count as "the same breath".
  const split = computeStats([
    { who: 'rep', text: 'I guarantee a lead number in writing.' },
    { who: 'prospect', text: 'Okay.' },
    { who: 'rep', text: 'You need 4 stars, 20 reviews, one in the last 90 days and call tracking.' },
  ]);
  assert.ok(split.banned.includes('the lead guarantee without its conditions'));
  // Saying you never guarantee a ranking is fine.
  assert.equal(guaranteeProblem("I'd never guarantee a ranking."), false);
});

test('Rock Solid Tile only with the family disclosure and no results', () => {
  const ok = "I work with Rock Solid Tile in Port Charlotte. Full disclosure, they're family. It's early, so I won't quote you results yet.";
  assert.deepEqual(computeStats([{ who: 'rep', text: ok }]).banned, []);
  assert.ok(computeStats([{ who: 'rep', text: 'I work with Rock Solid Tile in Port Charlotte.' }]).banned.includes('Rock Solid Tile without the family disclosure'));
  assert.ok(computeStats([{ who: 'rep', text: "Rock Solid Tile, they're family, got 40 calls last month." }]).banned.includes('a client result quoted'));
});

test('the price only on the second "how much?"', () => {
  const right = computeStats([
    { who: 'prospect', text: 'How much is it?' },
    { who: 'rep', text: 'There are two plans. The first one runs your Google profile, reviews, posts and the website.' },
    { who: 'prospect', text: 'Okay, but ballpark, what are we talking?' },
    { who: 'rep', text: 'Plan one is $697 a month, plan two is $997.' },
  ]);
  assert.equal(right.priceAsks, 2);
  assert.equal(right.priceTooEarly, false);
  assert.ok(!right.banned.includes('a price before the second "how much?"'));

  const early = computeStats([
    { who: 'prospect', text: 'How much is it?' },
    { who: 'rep', text: "It's $697 a month." },
  ]);
  assert.equal(early.priceTooEarly, true);
  assert.ok(early.banned.includes('a price before the second "how much?"'));
});

test('one specific time, and the voicemail number counted', () => {
  const st = computeStats([{ who: 'rep', text: 'How about Thursday at 10?' }]);
  assert.equal(st.offeredOneTime, true);
  assert.equal(st.offeredTwoTimes, false);
  assert.equal(computeStats([{ who: 'rep', text: 'Sometime next week?' }]).offeredOneTime, false);
  const vm = computeStats([{ who: 'rep', text: "Hi Mike, it's Wyatt Brunderman with Biggify. My number is 941-401-8288. That's 941-401-8288. The reason I'm calling: I looked at how Dawson Plumbing shows up on Google. Let's grab 15 minutes this week. Again, Wyatt, 941-401-8288. 941-401-8288." }]);
  assert.equal(vm.numberSaidTimes, 4);
});

test('some prospects ask the price twice and some ask "does it work?", never on gatekeeper or voicemail drills', () => {
  resetRecent();
  const rand = seeded(11);
  let twice = 0;
  let works = 0;
  const n = 200;
  for (let i = 0; i < n; i++) {
    const s = buildScenario({ gender: 'm', drillId: 'full', rand });
    if (s.priceTwice) {
      twice++;
      assert.ok(s.objections.some((o) => o.key === 'price_twice'));
      assert.ok(!s.objections.some((o) => o.key === 'price_early'));
      assert.match(actorSystem(s).map((b) => b.text).join('\n'), /ask the price TWICE/);
    }
    if (s.asksDoesItWork) {
      works++;
      assert.ok(s.objections.some((o) => o.key === 'does_it_work'));
    }
    // Neither habit shows in the brief he hears before dialing.
    assert.doesNotMatch(s.brief, /how much|price|does it work|twice/i);
  }
  assert.ok(twice > n * 0.2 && twice < n * 0.6, `price twice ${twice}/${n}`);
  assert.ok(works > n * 0.2 && works < n * 0.6, `does it work ${works}/${n}`);
  for (const drillId of ['gatekeeper', 'voicemail']) {
    for (let i = 0; i < 30; i++) {
      const s = buildScenario({ gender: 'f', drillId, rand });
      assert.equal(s.priceTwice, false);
      assert.equal(s.asksDoesItWork, false);
    }
  }
});

test('the brief carries a true compliment; the coach grades against v3', () => {
  resetRecent();
  const s = buildScenario({ gender: 'm', drillId: 'full', rand: seeded(5) });
  assert.ok(s.compliment && s.compliment.length > 10);
  assert.match(s.brief, /Something true to compliment: /);
  assert.match(PLAYBOOK, /cold-call script v3/);
  for (const must of ["The reason I'm calling", 'A-C-A', 'ONE specific time', '15 minutes', 'SECOND time they ask', '4 stars or better, 20 reviews, one in the last 90 days', 'Full disclosure, they\'re family', 'NEVER offered', '941-401-8288. That\'s 941-401-8288']) {
    assert.ok(PLAYBOOK.includes(must), must);
  }
  assert.doesNotMatch(PLAYBOOK, /20-minute meeting|Is tomorrow at \[time\] or Thursday at \[time\] better/);
  const run = { turns: [{ who: 'rep', text: V3_OPENER }], stats: computeStats([{ who: 'rep', text: V3_OPENER }]) };
  const req = scorecardRequest(s, run, { roundNo: 1 });
  assert.match(req, /the reason I'm calling/);
  assert.match(req, /one turnaround, then accept the second no/);
  assert.match(req, /ONE specific time, then silence/);
  assert.match(req, /the price only on the second "how much\?"/);
  assert.match(req, /without its conditions/);
  assert.match(req, /his first line said "the reason I'm calling"/);
  assert.match(req, /A true compliment he could use/);
  for (const d of DRILLS) assert.doesNotMatch(`${d.goal} ${d.rubric} ${d.actor}`, /20-minute|two (specific )?times/i, d.id);
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

// ---- the actor's reply, with a fake model (2026-11-13: hung up on its first line, and once answered AS Wyatt) ----

// A fake model: each call returns the next scripted reply, sentence by sentence, like streamReply does.
function fakeModel(replies) {
  const calls = [];
  const fn = async ({ messages, onSentence }) => {
    calls.push(messages);
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    for (const s of r.text.split(/(?<=[.?!])\s+/).filter(Boolean)) onSentence?.(s);
    return { text: r.text, message: { content: r.end ? [{ type: 'tool_use', name: 'end_scene', input: { outcome: r.end } }] : [] } };
  };
  fn.calls = calls;
  return fn;
}

function sessionWith(replies, { drillId = 'full', difficulty } = {}) {
  resetRecent();
  const scenario = buildScenario({ gender: 'm', drillId });
  if (difficulty) scenario.difficulty = difficulty;
  const reply = fakeModel(replies);
  const s = new PracticeSession({ scenario, voice: { id: 'Telnyx.NaturalHD.orion', gender: 'm' }, reply });
  return { s, reply };
}

test('the prospect cannot hang up on its very first reply (easy or normal)', async () => {
  const { s } = sessionWith([{ text: 'Not interested.', end: 'not_interested' }], { drillId: 'opener', difficulty: 'easy' });
  const out = await s.handleUtterance('hey is this Mike? It\'s Wyatt with Biggify.');
  assert.match(out, /Not interested/);
  assert.equal(s.ended, false);
  assert.equal(s.phase, 'roleplay');
});

test('the prospect never hangs up on a question it just asked', async () => {
  const { s } = sessionWith([{ text: 'Yeah?' }, { text: 'Not interested. Who is this?', end: 'not_interested' }], { drillId: 'full' });
  await s.handleUtterance('Hi, is this the owner?');
  await s.handleUtterance('Great, the reason I\'m calling is your Google listing.');
  assert.equal(s.ended, false);
});

test('a tough prospect may still hang up on a bad opener, and anyone may once the rep says bye', async () => {
  const tough = sessionWith([{ text: 'Not interested. Bye.', end: 'hung_up' }], { drillId: 'full', difficulty: 'tough' });
  await tough.s.handleUtterance('so sorry to bother you, do you have thirty seconds');
  assert.equal(tough.s.ended, true);
  const bye = sessionWith([{ text: 'Alright, take care.', end: 'other' }], { drillId: 'full', difficulty: 'easy' });
  await bye.s.handleUtterance('okay no problem, have a good one, bye');
  assert.equal(bye.s.ended, true);
});

test('after the second line the prospect can end the scene normally', async () => {
  const { s } = sessionWith([{ text: 'Yeah?' }, { text: 'Not interested, take care.', end: 'not_interested' }], { drillId: 'full' });
  await s.handleUtterance('Hey, is this Jeff?');
  await s.handleUtterance('I can walk you through all our services, websites, reviews, social, receptionist, all of it.');
  assert.equal(s.ended, true);
  assert.equal(s.runs[0].run.outcome, 'not_interested');
});

test('a reply where the prospect talks as Wyatt is never spoken; it asks again with a reminder', async () => {
  const { s, reply } = sessionWith([
    { text: 'No, this is Wyatt with Biggify. When is a good time to call you back?', end: 'callback_time' },
    { text: 'No, this is Dawn. Who is this?' },
  ], { drillId: 'hotseat' });
  const out = await s.handleUtterance('hey is this Ron');
  assert.doesNotMatch(out, /Wyatt|Biggify/);
  assert.match(out, /this is Dawn|Who is this/);
  assert.equal(reply.calls.length, 2);
  assert.match(reply.calls[1].at(-1).content, /the person who ANSWERED the phone/);
  assert.equal(s.ended, false);
  assert.doesNotMatch(JSON.stringify(s.actorMessages), /Wyatt with Biggify/);
});

test('if it is still confused, the prospect just asks who this is', async () => {
  const { s } = sessionWith([{ text: "Hi, I'm Wyatt from Biggify." }], { drillId: 'full' });
  const out = await s.handleUtterance('hello?');
  assert.equal(out.trim(), 'Sorry, who is this?');
});

test('the role check leaves a prospect\'s normal questions alone', async () => {
  const { roleBreak } = await import('../src/practice/session.js');
  for (const ok of ['So you\'re from Biggify?', 'What does Biggify do?', 'Who is Wyatt?', 'Why are you calling me?', 'No, this is Mike.']) assert.equal(roleBreak(ok), false, ok);
  for (const bad of ['No, this is Wyatt with Biggify.', "Hey, it's Wyatt.", "I'm calling about your Google listing.", 'The reason I\'m calling is simple.', "I'm with Biggify."]) assert.equal(roleBreak(bad), true, bad);
});

test('the actor is told it is never the caller, and how to take a wrong name', () => {
  resetRecent();
  const sys = actorSystem(buildScenario({ gender: 'f', drillId: 'hotseat' })).map((b) => b.text).join('\n');
  assert.match(sys, /You are NEVER the caller/);
  assert.match(sys, /gets your name or your business name wrong/);
  assert.match(sys, /Never end the call on your first reply/);
});
