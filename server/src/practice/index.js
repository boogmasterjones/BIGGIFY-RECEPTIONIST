// The cold-call practice line: POST /practice-call-telnyx answers the call with a random voice and a
// random drill, and the shared /ws socket (index.js) hands the conversation to a PracticeSession
// when the socket URL carries ?practice=<id>. The receptionist path is untouched.

import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { buildScenario, recent } from './scenario.js';
import { pickVoice, markVoiceResult, voiceHealth } from './voices.js';
import { PracticeSession } from './session.js';
import { sendPracticeReport } from './report.js';

function escapeXml(s = '') {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Calls answered but whose socket hasn't connected yet (a few seconds at most).
const pending = new Map(); // id -> { scenario, voice, from, greeting, at }
const PENDING_TTL_MS = 2 * 60_000;
function prunePending() {
  const now = Date.now();
  for (const [id, p] of pending) if (now - p.at > PENDING_TTL_MS) pending.delete(id);
  while (pending.size > 50) pending.delete(pending.keys().next().value);
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
    // He can talk over the prospect (real calls are like that) and skip a brief he already knows.
    ` interruptible="speech"` +
    ` welcomeGreetingInterruptible="speech"` +
    ` events="speaker-events" />` +
    `</Connect>` +
    `</Response>`
  );
}

export function startPracticeCall({ from = '', publicUrl = config.publicUrl, rand = Math.random } = {}) {
  prunePending();
  const voice = pickVoice({ recent: recent.voices, rand });
  recent.voices.push(voice.id);
  while (recent.voices.length > 6) recent.voices.shift();
  const scenario = buildScenario({ gender: voice.gender, firstRound: true, rand });
  const greeting = `Cold call practice. ${scenario.brief}`;
  const id = randomUUID();
  pending.set(id, { scenario, voice, from, greeting, at: Date.now() });
  return { id, voice, scenario, greeting, xml: practiceAnswer(publicUrl, { voice, greeting, id }) };
}

// The socket connected: turn the pending call into a live session (once).
export function takePracticeSession(id) {
  const p = pending.get(id);
  if (!p) return null;
  pending.delete(id);
  return new PracticeSession(p);
}

// The socket closed: check the voice played, and email the report.
export function finishPracticeSession(session) {
  if (!session) return;
  const seconds = (Date.now() - session.startedAt) / 1000;
  markVoiceResult(session.voice.id, { spoke: session.agentSpoke, sentText: session.sentText, seconds });
  console.log(`[practice] call ended after ${Math.round(seconds)} s, ${session.runs.length} run(s), voice ${session.voice.id}`);
  sendPracticeReport(session)
    .then((r) => { if (r && !r.ok && r.reason !== 'no runs') console.log('[practice] report not sent:', r.reason || r.error); })
    .catch((e) => console.error('[practice] report:', e.message));
}

export function registerPracticeRoutes(app) {
  app.post('/practice-call-telnyx', (req, res) => {
    const from = req.body?.From || req.body?.from || '';
    if (!callerAllowed(from)) {
      console.log(`[practice] caller …${String(from).slice(-4)} not on PRACTICE_ALLOWED_CALLERS`);
      return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Telnyx.NaturalHD.luna">Sorry, this line is not in service.</Say><Hangup/></Response>');
    }
    try {
      const call = startPracticeCall({ from });
      console.log(`[practice] call from …${String(from).slice(-4)}: ${call.scenario.drill}, ${call.scenario.personalityLabel}, ${call.scenario.difficulty}, voice ${call.voice.id}`);
      res.type('text/xml').send(call.xml);
    } catch (err) {
      console.error('[practice] ERROR:', err.stack || err.message);
      res.status(500).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, the practice line hit a snag. Try again in a minute.</Say></Response>');
    }
  });

  // Which voices went silent (if any), for a quick look in the browser.
  app.get('/practice-voices', (_req, res) => res.json(voiceHealth()));
}
