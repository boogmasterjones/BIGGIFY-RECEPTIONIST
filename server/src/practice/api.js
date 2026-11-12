// The practice line's API for Hubert's "Sales drilling" tab. Hubert (server side only) calls these with
// the header `Authorization: Bearer <PRACTICE_API_SECRET>`; the same value is set on Render and on
// Netlify. Without the setting the API answers 503 and the tab says it is not connected.
//
//   GET  /practice-api/state   the armed drill (the brief only), the drill on the phone right now (if any),
//                              and the last few finished drills with scorecard, transcript and the reveal
//   POST /practice-api/arm     { mode: random | drill | easier | harder | rerun, drill?: <drill id> }
//                              arms a new drill (one at a time) and answers with the new state
//
// Hidden traits never leave through the armed or live drill: see publicDrill() in armed.js.

import { timingSafeEqual } from 'node:crypto';
import { drillStore } from './store.js';
import { armDrill, publicDrill, resultView, ARM_MODES } from './armed.js';
import { DRILLS } from './drills.js';

const MIN_SECRET_LENGTH = 24;

export function apiSecret() {
  const s = (process.env.PRACTICE_API_SECRET || '').trim();
  return s.length >= MIN_SECRET_LENGTH ? s : '';
}

export function authorized(header, secret = apiSecret()) {
  if (!secret) return false;
  const m = /^Bearer\s+(.+)$/i.exec(String(header || '').trim());
  if (!m) return false;
  const a = Buffer.from(m[1].trim());
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Ten wrong guesses a minute per address is plenty for a typo and useless for guessing.
const failures = new Map(); // ip -> { n, since }
function tooManyFailures(ip) {
  const f = failures.get(ip);
  if (!f) return false;
  if (Date.now() - f.since > 60_000) { failures.delete(ip); return false; }
  return f.n >= 10;
}
function noteFailure(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.since > 60_000) failures.set(ip, { n: 1, since: Date.now() });
  else f.n++;
  if (failures.size > 500) failures.delete(failures.keys().next().value);
}
export function resetApiFailures() {
  failures.clear();
}

export async function practiceState(store = drillStore(), { limit = 8 } = {}) {
  const [armed, recentRows] = await Promise.all([store.getArmed(), store.recent({ statuses: ['done', 'live'], limit: limit + 2 })]);
  // A drill left 'live' by a restart mid-call is not shown after an hour.
  const fresh = (r) => Date.now() - Date.parse(r.started_at || r.updated_at || r.created_at || 0) < 60 * 60_000;
  const live = recentRows.filter((r) => r.status === 'live' && fresh(r)).map(publicDrill);
  const done = recentRows.filter((r) => r.status === 'done').slice(0, limit).map(resultView);
  return {
    armed: publicDrill(armed),
    live, // on the phone now, or just ended and being scored
    recent: done,
    drills: DRILLS.map((d) => ({ id: d.id, num: d.num, name: d.name, goal: d.goal })),
  };
}

export function registerPracticeApi(app, { store } = {}) {
  const db = () => store || drillStore();
  const guard = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!apiSecret()) return res.status(503).json({ error: 'The practice API is not set up (PRACTICE_API_SECRET).' });
    const ip = req.ip || req.socket?.remoteAddress || '';
    if (tooManyFailures(ip)) return res.status(429).json({ error: 'Too many tries. Wait a minute.' });
    if (!authorized(req.get('authorization'))) {
      noteFailure(ip);
      return res.status(401).json({ error: 'Not allowed.' });
    }
    next();
  };

  app.get('/practice-api/state', guard, async (_req, res) => {
    try {
      res.json(await practiceState(db()));
    } catch (err) {
      console.error('[practice api] state:', err.message);
      res.status(500).json({ error: 'Could not read the drills.' });
    }
  });

  app.post('/practice-api/arm', guard, async (req, res) => {
    const mode = String(req.body?.mode || '');
    const drill = String(req.body?.drill || '');
    if (!ARM_MODES.includes(mode)) return res.status(400).json({ error: 'Unknown mode.' });
    try {
      await armDrill(db(), { mode, drill });
    } catch (err) {
      if (/unknown|already|no finished/.test(err.message)) return res.status(400).json({ error: err.message });
      console.error('[practice api] arm:', err.message);
      return res.status(500).json({ error: 'Could not arm a drill.' });
    }
    try {
      res.json(await practiceState(db()));
    } catch (err) {
      console.error('[practice api] state:', err.message);
      res.status(500).json({ error: 'Armed, but could not read the drills back.' });
    }
  });
}
