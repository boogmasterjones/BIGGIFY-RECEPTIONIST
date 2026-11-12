// The cold-call practice line: POST /practice-call-telnyx takes the drill armed on Hubert's "Sales drilling"
// tab (or makes one when nothing is armed) and answers AS that prospect: the welcome greeting is the
// prospect's own pickup line, with no brief and no coach. The shared /ws socket (index.js) hands the
// conversation to a PracticeSession when the socket URL carries ?practice=<id>. When the call ends the runs
// are scored, saved for the tab, emailed, and the next drill is armed. The receptionist path is untouched.

import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { pickVoice, markVoiceResult, voiceHealth, isVoiceBad } from './voices.js';
import { recent } from './scenario.js';
import { PracticeSession } from './session.js';
import { sendPracticeReport } from './report.js';
import { drillStore } from './store.js';
import { newDrillRow, currentTarget, autoArmAfterCall, nextTarget } from './armed.js';
import { registerPracticeApi } from './api.js';

function escapeXml(s = '') {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Calls answered but whose socket hasn't connected yet (a few seconds at most).
const pending = new Map(); // id -> { scenario, voice, from, greeting, drillRowId, drillRow, at }
const PENDING_TTL_MS = 2 * 60_000;
// A call whose socket never connected never used its drill: give it back (armed again when nothing else is).
async function prunePending(store) {
  const now = Date.now();
  const dropped = [];
  for (const [id, p] of pending) if (now - p.at > PENDING_TTL_MS) { pending.delete(id); dropped.push(p); }
  while (pending.size > 50) { const k = pending.keys().next().value; dropped.push(pending.get(k)); pending.delete(k); }
  for (const p of dropped) {
    if (!p?.drillRowId) continue;
    try {
      const armed = await within(STORE_TIMEOUT_MS, store.getArmed());
      await within(STORE_TIMEOUT_MS, store.update(p.drillRowId, armed ? { status: 'replaced' } : { status: 'armed', started_at: null }));
    } catch (err) {
      console.error('[practice] could not give back an unused drill:', err.message);
    }
  }
}

// The database must never hold up an answering phone for long.
const STORE_TIMEOUT_MS = 2500;
function within(ms, promise) {
  let timer;
  return Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timed out after ${ms} ms`)), ms); })]).finally(() => clearTimeout(timer));
}

// PRACTICE_ALLOWED_CALLERS (optional): comma-separated numbers allowed to use the line. Empty = anyone.
export function callerAllowed(from) {
  const list = (process.env.PRACTICE_ALLOWED_CALLERS || '').split(',').map((s) => s.replace(/\D/g, '').slice(-10)).filter(Boolean);
  if (!list.length) return true;
  return list.includes(String(from || '').replace(/\D/g, '').slice(-10));
}

export function practiceAnswer(publicUrl, { voice, greeting, id }) {
  const base = (publicUrl ? publicUrl.replace(/^http/, 'ws') : `ws://localhost:${config.port}`) + '/ws';
  const wsUrl = `${base}?practice=${encodeURIComponent(id)}`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${escapeXml(wsUrl)}"` +
    ` welcomeGreeting="${escapeXml(greeting)}"` +
    ` voice="${escapeXml(voice.id)}"` +
    ` language="en"` +
    ` transcriptionProvider="${escapeXml(config.telnyx.transcriptionProvider)}"` +
    // He can talk over the prospect, the way real calls go, even over the "hello".
    ` interruptible="speech"` +
    ` welcomeGreetingInterruptible="speech"` +
    ` events="speaker-events" />` +
    `</Connect>` +
    `</Response>`
  );
}

// Take the armed drill for this call, or make one. Never throws: a database problem still answers the
// phone, with a drill that lives in memory only.
async function drillForCall({ from, store, rand }) {
  const startedPatch = { status: 'live', started_at: new Date().toISOString(), caller_last4: String(from || '').replace(/\D/g, '').slice(-4) || null };
  try {
    const armed = await within(STORE_TIMEOUT_MS, store.getArmed());
    if (armed) {
      const taken = await within(STORE_TIMEOUT_MS, store.takeArmed(armed.id, startedPatch));
      if (taken) return taken;
    }
  } catch (err) {
    console.error('[practice] could not read the armed drill:', err.message);
  }
  // Nothing armed: make one now. It shows on the tab afterwards like any other drill.
  let target = 1;
  try { target = await within(STORE_TIMEOUT_MS, currentTarget(store)); } catch { /* default */ }
  const row = { ...newDrillRow({ target, source: 'call', status: 'live', rand }), ...startedPatch };
  try {
    return await within(STORE_TIMEOUT_MS, store.insert(row));
  } catch (err) {
    console.error('[practice] could not save the new drill:', err.message);
    return { ...row, id: null };
  }
}

export async function startPracticeCall({ from = '', publicUrl = config.publicUrl, rand = Math.random, store = drillStore() } = {}) {
  await prunePending(store);
  const row = await drillForCall({ from, store, rand });
  const scenario = row.scenario;
  // The armed voice, unless it went silent since: then another voice of the same gender (the prospect's
  // name and gender were made to match it).
  let voice = row.voice;
  if (!voice?.id || isVoiceBad(voice.id)) voice = pickVoice({ recent: recent.voices, rand, gender: scenario.gender });
  // No brief, no coach: the prospect picks up.
  const greeting = scenario.pickup;
  const id = randomUUID();
  pending.set(id, { scenario, voice, from, greeting, drillRowId: row.id, drillRow: row, at: Date.now() });
  return { id, voice, scenario, greeting, drillRowId: row.id, xml: practiceAnswer(publicUrl, { voice, greeting, id }) };
}

// The socket connected: turn the pending call into a live session (once).
export function takePracticeSession(id) {
  const p = pending.get(id);
  if (!p) return null;
  pending.delete(id);
  return new PracticeSession(p);
}

const recordFields = (r) => ({
  outcome: r.run.outcome || null,
  note: r.run.note || null,
  paused: Boolean(r.paused),
  score: r.score,
  scorecard: r.scorecard || null,
  turns: r.run.turns,
  stats: r.run.stats,
  ended_at: r.endedAt || new Date().toISOString(),
});

/**
 * Save what happened for Hubert's tab and arm the next drill. Exported for the tests.
 * - The first run updates the drill row the call took; a re-run of the same prospect on the same call
 *   (hidden "coach", then "again") becomes a row of its own.
 * - A call where he never said a word puts the drill back as armed, so the next call gets it again.
 */
export async function saveSessionResults(session, { store = drillStore(), rand = Math.random } = {}) {
  const runs = session.runs.filter((r) => r.run.turns.some((t) => t.who === 'rep'));
  const row = session.drillRow || {};
  let target = session.difficultyTarget;
  if (!runs.length) {
    if (session.drillRowId) {
      const armed = await store.getArmed();
      if (!armed) return store.update(session.drillRowId, { status: 'armed', started_at: null });
      await store.update(session.drillRowId, { status: 'replaced' });
      return null;
    }
    return autoArmAfterCall(store, { ...row, next_target: target }, { rand });
  }
  let last = null;
  for (const [i, r] of runs.entries()) {
    target = nextTarget(target, r.paused ? null : r.score);
    const fields = { ...recordFields(r), status: 'done', next_target: target };
    if (i === 0 && session.drillRowId) {
      last = await store.update(session.drillRowId, fields);
    } else {
      last = await store.insert({
        ...fields,
        source: i === 0 ? row.source || 'call' : 'rerun',
        drill: r.scenario.drill,
        difficulty: r.scenario.difficulty,
        difficulty_target: Number.isInteger(row.difficulty_target) ? row.difficulty_target : session.difficultyTarget,
        sticky_drill: row.sticky_drill || null,
        scenario: r.scenario,
        voice: session.voice,
        started_at: new Date(session.startedAt).toISOString(),
      });
    }
  }
  return autoArmAfterCall(store, { ...(last || row), next_target: target, sticky_drill: row.sticky_drill || null }, { rand });
}

// The socket closed: check the voice played, score the runs, save them for the tab, arm the next drill,
// and email the report. Returns the promise so tests can wait for it; the socket never does.
export function finishPracticeSession(session, { store = drillStore(), score } = {}) {
  if (!session) return Promise.resolve();
  const seconds = (Date.now() - session.startedAt) / 1000;
  markVoiceResult(session.voice.id, { spoke: session.agentSpoke, sentText: session.sentText, seconds });
  session.closeOpenRun();
  console.log(`[practice] call ended after ${Math.round(seconds)} s, ${session.runs.length} run(s), voice ${session.voice.id}`);
  return (async () => {
    await session.scoreRuns(score ? { score } : {});
    try {
      const armed = await saveSessionResults(session, { store });
      if (armed) console.log(`[practice] armed for the next call: ${armed.drill}, ${armed.difficulty}`);
    } catch (err) {
      console.error('[practice] could not save the results:', err.message);
    }
    try {
      const r = await sendPracticeReport(session);
      if (r && !r.ok && r.reason !== 'no runs') console.log('[practice] report not sent:', r.reason || r.error);
    } catch (e) {
      console.error('[practice] report:', e.message);
    }
  })();
}

export function registerPracticeRoutes(app, { store } = {}) {
  app.post('/practice-call-telnyx', async (req, res) => {
    const from = req.body?.From || req.body?.from || '';
    if (!callerAllowed(from)) {
      console.log(`[practice] caller …${String(from).slice(-4)} not on PRACTICE_ALLOWED_CALLERS`);
      return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Telnyx.NaturalHD.luna">Sorry, this line is not in service.</Say><Hangup/></Response>');
    }
    try {
      const call = await startPracticeCall({ from, ...(store ? { store } : {}) });
      console.log(`[practice] call from …${String(from).slice(-4)}: ${call.scenario.drill}, ${call.scenario.personalityLabel}, ${call.scenario.difficulty}, voice ${call.voice.id}, drill row ${call.drillRowId || 'none'}`);
      res.type('text/xml').send(call.xml);
    } catch (err) {
      console.error('[practice] ERROR:', err.stack || err.message);
      res.status(500).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, the practice line hit a snag. Try again in a minute.</Say></Response>');
    }
  });

  // Which voices went silent (if any), for a quick look in the browser.
  app.get('/practice-voices', (_req, res) => res.json(voiceHealth()));

  // Hubert's Sales drilling tab (shared secret).
  registerPracticeApi(app, { store });
}
