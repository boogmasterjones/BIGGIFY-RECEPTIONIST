// The armed drill: the one prospect the next call to 646-3030 gets. Hubert's "Sales drilling" tab shows
// it (the brief, never the hidden traits) and can swap it; the phone line takes it when a call comes in,
// and arms the next one when the call is over.

import { buildScenario, recent, DIFFICULTIES } from './scenario.js';
import { DRILLS, DRILL_BY_ID } from './drills.js';
import { pickVoice } from './voices.js';

export const ARM_MODES = ['random', 'drill', 'easier', 'harder', 'rerun'];

const clampTarget = (n) => Math.max(0, Math.min(2, Number.isInteger(n) ? n : 1));

// A fresh drill row (not saved). The voice is picked here because the prospect's name and gender follow it.
export function newDrillRow({ drillId = '', target = 1, exact = false, sticky = null, source = 'hubert', status = 'armed', rand = Math.random } = {}) {
  const voice = pickVoice({ recent: recent.voices, rand });
  recent.voices.push(voice.id);
  while (recent.voices.length > 6) recent.voices.shift();
  const scenario = buildScenario({ gender: voice.gender, drillId, difficulty: clampTarget(target), exactDifficulty: exact, firstRound: false, rand });
  return {
    status,
    source,
    drill: scenario.drill,
    difficulty: scenario.difficulty,
    difficulty_target: clampTarget(target),
    sticky_drill: sticky && DRILL_BY_ID[sticky] ? sticky : null,
    scenario,
    voice,
  };
}

// Where difficulty stands now: the armed drill's target, else what the last scored call left it at.
export async function currentTarget(store) {
  const armed = await store.getArmed();
  if (armed) return clampTarget(armed.difficulty_target);
  const [last] = await store.recent({ statuses: ['done'], limit: 1 });
  if (last) return clampTarget(Number.isInteger(last.next_target) ? last.next_target : last.difficulty_target);
  return 1;
}

/**
 * Arm a drill from Hubert's tab.
 *   random  a new prospect, any drill (weighted, not the last two)
 *   drill   a new prospect for this drill; later calls keep to this drill until he picks random
 *   easier / harder  a new prospect, same drill, one difficulty step down / up
 *   rerun   the last finished call's prospect again, from the top (same voice, same hidden details)
 * Returns the saved row, or throws a message fit to show him.
 */
export async function armDrill(store, { mode = 'random', drill = '', rand = Math.random } = {}) {
  if (!ARM_MODES.includes(mode)) throw new Error('unknown mode');
  const armed = await store.getArmed();
  if (mode === 'random') {
    return store.insert(newDrillRow({ target: await currentTarget(store), source: 'hubert', rand }));
  }
  if (mode === 'drill') {
    if (!DRILL_BY_ID[drill]) throw new Error('unknown drill');
    return store.insert(newDrillRow({ drillId: drill, target: await currentTarget(store), sticky: drill, source: 'hubert', rand }));
  }
  if (mode === 'easier' || mode === 'harder') {
    const base = armed || (await store.recent({ statuses: ['done'], limit: 1 }))[0];
    const now = base ? DIFFICULTIES.indexOf(base.difficulty) : 1;
    const step = mode === 'easier' ? -1 : 1;
    const target = clampTarget(now + step);
    if (base && target === now) throw new Error(mode === 'easier' ? 'already on easy' : 'already on tough');
    return store.insert(newDrillRow({ drillId: base?.drill || '', target, exact: true, sticky: base?.sticky_drill || null, source: 'hubert', rand }));
  }
  // rerun
  const [last] = await store.recent({ statuses: ['done'], limit: 1 });
  if (!last) throw new Error('no finished drill to re-run yet');
  return store.insert({
    status: 'armed',
    source: 'rerun',
    drill: last.drill,
    difficulty: last.difficulty,
    difficulty_target: DIFFICULTIES.indexOf(last.difficulty),
    sticky_drill: last.sticky_drill || null,
    scenario: last.scenario,
    voice: last.voice,
    rerun_of: last.id,
  });
}

// After a call: arm the next one, unless he armed something himself in the meantime. Same drill when he
// picked one on the tab (sticky), otherwise random. Difficulty follows the score.
export async function autoArmAfterCall(store, finished, { rand = Math.random } = {}) {
  if (await store.getArmed()) return null;
  const target = finished && Number.isInteger(finished.next_target) ? finished.next_target : finished?.difficulty_target ?? 1;
  const sticky = finished?.sticky_drill || null;
  return store.insert(newDrillRow({ drillId: sticky || '', target, sticky, source: 'auto', rand }));
}

// Harder after a strong score, easier after a weak one (the same rule the line always used).
export function nextTarget(target, score) {
  const t = clampTarget(target);
  if (score === null || score === undefined) return t;
  if (score >= 8) return Math.min(2, t + 1);
  if (score <= 4) return Math.max(0, t - 1);
  return t;
}

// ---- What Hubert may see -----------------------------------------------------------------------

// The brief: what a rep knows before he dials (the lead list and a 30-second look at Google). Built from
// an allow-list on purpose: the personality, the hidden situation, the pains, the objections, what makes
// them say yes, the pickup line and the voice never leave the server before the call is over.
export function publicDrill(row) {
  if (!row) return null;
  const s = row.scenario || {};
  const d = DRILL_BY_ID[row.drill] || DRILL_BY_ID[s.drill] || DRILLS[0];
  const b = s.biz || {};
  return {
    id: row.id,
    status: row.status,
    source: row.source || null,
    sticky: Boolean(row.sticky_drill),
    armedAt: row.armed_at || row.created_at || null,
    startedAt: row.started_at || null,
    drill: { id: d.id, num: d.num, name: d.name, goal: d.goal, scoredOn: d.rubric },
    difficulty: row.difficulty || s.difficulty || 'normal',
    whoAnswers: d.gatekeeper ? 'someone else (a gatekeeper)' : d.voicemail ? 'voicemail' : 'the owner',
    owner: { first: s.owner?.first || '', last: s.owner?.last || '' },
    business: b.name || '',
    trade: b.trade?.label || '',
    town: b.town || '',
    state: b.state || '',
    remote: Boolean(b.remote),
    timezone: b.tz || 'Eastern',
    trueThing: s.trueThing || '',
    // A true, visible thing to compliment in the v3 opener (public, like the true thing).
    compliment: s.compliment || '',
  };
}

// After the call: everything, including what was hidden.
export function resultView(row) {
  if (!row) return null;
  const s = row.scenario || {};
  const b = s.biz || {};
  const pub = publicDrill(row);
  if (row.status !== 'done') return { ...pub, result: null };
  return {
    ...pub,
    endedAt: row.ended_at || null,
    result: {
      outcome: row.outcome || null,
      note: row.note || null,
      paused: Boolean(row.paused),
      score: Number.isInteger(row.score) ? row.score : null,
      scorecard: row.scorecard || '',
      stats: row.stats || null,
      transcript: [
        ...(s.pickup ? [{ who: 'prospect', text: s.pickup }] : []),
        ...(Array.isArray(row.turns) ? row.turns : []).map((t) => ({ who: t.who === 'rep' ? 'rep' : 'prospect', text: String(t.text || '') })),
      ],
      revealed: {
        whoAnswered: s.role === 'owner' ? `${s.speaker?.first || ''} ${s.speaker?.last || ''}`.trim() : `${s.speaker?.first || ''} (${s.role || ''})`,
        personality: s.personalityLabel || '',
        personalityHow: s.personalityHow || s.gatekeeperHow || '',
        situation: s.situation || '',
        pains: Array.isArray(s.pains) ? s.pains : [],
        aboutTheTrueThing: s.trueThingPain ? `They ${s.trueThingPain}.` : '',
        whatMakesThemSayYes: s.yesKey || '',
        decider: s.decider || '',
        objections: Array.isArray(s.objections) ? s.objections.map((o) => o.line) : [],
        yearsInBusiness: b.years ?? null,
        crew: b.crew || '',
        typicalJob: b.jobValue ?? null,
        voice: row.voice?.id || '',
      },
    },
  };
}
