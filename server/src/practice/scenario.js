// Builds one practice scenario: who answers, their business, their hidden situation, the drill, and
// the brief Wyatt hears before he "dials". Random every time, and steered away from whatever came
// up on the last few calls so it doesn't repeat.

import {
  MALE_NAMES, FEMALE_NAMES, SURNAMES, TRADES, LOCAL_TOWNS, REMOTE_TOWNS, TRUE_THINGS, SITUATIONS,
  PAINS, YES_KEYS, OBJECTIONS, PERSONALITIES, GATEKEEPERS,
} from './content.js';
import { DRILLS, DRILL_BY_ID } from './drills.js';

// What came up on recent calls (this server process only). Lists are trimmed to `RECENT_MAX`.
const RECENT_MAX = 6;
export const recent = { drills: [], trades: [], personalities: [], names: [], towns: [], voices: [], trueThings: [] };
function remember(key, value) {
  const list = recent[key];
  list.push(value);
  while (list.length > RECENT_MAX) list.shift();
}
export function resetRecent() {
  for (const k of Object.keys(recent)) recent[k].length = 0;
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// Prefer items not used recently; fall back to the full list.
function pickFresh(rand, list, recentList, key = (x) => x) {
  const fresh = list.filter((x) => !recentList.includes(key(x)));
  return pick(rand, fresh.length ? fresh : list);
}

function weighted(rand, items, weightOf) {
  const total = items.reduce((s, x) => s + weightOf(x), 0);
  let r = rand() * total;
  for (const x of items) {
    r -= weightOf(x);
    if (r <= 0) return x;
  }
  return items[items.length - 1];
}

function shuffle(rand, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const article = (w) => (/^[aeiou]/i.test(w) || /^AC/.test(w) ? 'an' : 'a');
const between = (rand, lo, hi) => Math.round(lo + rand() * (hi - lo));
const roundTo = (n, step) => Math.round(n / step) * step;

// A drill at random, weighted, avoiding the last two drills.
export function pickDrill(rand = Math.random) {
  const last2 = recent.drills.slice(-2);
  const pool = DRILLS.filter((d) => !last2.includes(d.id));
  return weighted(rand, pool.length ? pool : DRILLS, (d) => d.weight);
}

export const DIFFICULTIES = ['easy', 'normal', 'tough'];

function pickDifficulty(rand, target) {
  // `target` (0 easy .. 2 tough) comes from how the last runs went; the dice still move it a step sometimes.
  const t = Number.isInteger(target) ? target : 1;
  const r = rand();
  const idx = r < 0.6 ? t : r < 0.8 ? t - 1 : t + 1;
  return DIFFICULTIES[Math.max(0, Math.min(2, idx))];
}

function businessName(rand, { first, last, gender }, trade) {
  const place = pick(rand, ['Gulf Coast', 'Suncoast', 'Peace River', 'Paradise', 'Island', 'Bayside', 'Palm', 'Coastal', 'Precision', 'Elite', 'Hometown', 'Sunshine', 'Tri-County', 'Five Star']);
  const forms = [
    `${last} ${trade.noun}`,
    `${place} ${trade.noun}`,
    `${first}'s ${trade.noun}`,
    `${last} ${gender === 'm' ? '& Sons' : '& Daughters'} ${trade.noun}`,
    `${last} Family ${trade.noun}`,
  ];
  return pick(rand, forms);
}

function person(rand, gender) {
  const first = pickFresh(rand, gender === 'm' ? MALE_NAMES : FEMALE_NAMES, recent.names);
  const last = pick(rand, SURNAMES);
  return { first, last, gender };
}

function money(n) {
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

/**
 * Build a scenario.
 * @param {object} o
 * @param {string} o.gender      'm' | 'f' — the voice's gender; whoever speaks must match it
 * @param {string} [o.drillId]   a drill id, or empty for random
 * @param {number} [o.difficulty] 0..2 target difficulty
 * @param {boolean} [o.firstRound] the brief mentions the menu and the safe word only on the first round
 * @param {Function} [o.rand]
 */
export function buildScenario({ gender, drillId = '', difficulty = 1, firstRound = true, rand = Math.random } = {}) {
  const drill = DRILL_BY_ID[drillId] || pickDrill(rand);
  const level = pickDifficulty(rand, difficulty);

  // Who answers. In the gatekeeper drill the voice is the gatekeeper and the owner (any gender) never speaks.
  const speaker = person(rand, gender);
  const owner = drill.gatekeeper ? person(rand, rand() < 0.75 ? 'm' : 'f') : speaker;

  const trade = pickFresh(rand, TRADES, recent.trades, (t) => t.id);
  const remote = rand() < 0.25;
  const where = remote ? pick(rand, REMOTE_TOWNS) : { town: pickFresh(rand, LOCAL_TOWNS, recent.towns), state: 'Florida', tz: 'Eastern' };

  const biz = {
    name: businessName(rand, owner, trade),
    trade,
    town: where.town,
    state: where.state,
    tz: where.tz,
    remote,
    years: between(rand, 2, 32),
    crew: pick(rand, ['just the owner', 'the owner and one helper', 'two crews', 'about six people', 'three trucks and eight guys', 'the owner, a spouse in the office and two installers']),
    jobValue: roundTo(between(rand, trade.value[0], trade.value[1]), trade.value[1] > 5000 ? 500 : 50),
    reviews: between(rand, 3, 26),
    compLow: between(rand, 35, 80),
    compHigh: between(rand, 120, 320),
  };

  const trueThingIdx = TRUE_THINGS.indexOf(pickFresh(rand, TRUE_THINGS, recent.trueThings, (t) => TRUE_THINGS.indexOf(t)));
  const trueThing = TRUE_THINGS[trueThingIdx];

  let personalityId = null;
  let gatekeeper = null;
  if (drill.gatekeeper) gatekeeper = pick(rand, GATEKEEPERS);
  else personalityId = pickFresh(rand, drill.personalities, recent.personalities);
  const personality = personalityId ? PERSONALITIES[personalityId] : null;

  // Hidden details: what is really going on in this business.
  const pains = shuffle(rand, PAINS).slice(0, 2);
  const situation = pick(rand, SITUATIONS);
  const yesKey = pick(rand, YES_KEYS);
  const decider = rand() < 0.3 ? (owner.gender === 'm' ? 'his wife' : 'her husband') : rand() < 0.2 ? 'a business partner' : '';

  // Objections this person is likely to raise (a gauntlet uses five, in order).
  let objections = personality ? [...personality.objections] : [];
  if (drill.gauntlet) {
    const extra = shuffle(rand, ['send_info', 'referrals', 'too_expensive', 'burned', 'have_guy', 'number_one', 'contract', 'results', 'think', 'robot', 'price_early', 'after_season', 'enough_reviews']);
    if (remote) extra.unshift('not_local');
    objections = [...new Set([...shuffle(rand, objections).slice(0, 2), ...extra])].slice(0, level === 'easy' ? 4 : 5);
  } else {
    objections = shuffle(rand, objections).slice(0, level === 'tough' ? 3 : 2);
    if (remote && rand() < 0.5) objections.push('not_local');
  }

  const pickupTemplate = drill.voicemail
    ? null
    : gatekeeper
      ? gatekeeper.pickup
      : pick(rand, personality.pickup);
  const fill = (s) => s.replace(/\{first\}/g, speaker.first).replace(/\{biz\}/g, biz.name);
  const pickup = drill.voicemail
    ? `Hi, you've reached ${biz.name}. We can't get to the phone right now. Leave your name and number and we'll get back to you. Beep.`
    : fill(pickupTemplate);

  const scenario = {
    id: Math.floor(rand() * 1e9).toString(36),
    drill: drill.id,
    difficulty: level,
    gender,
    speaker,
    owner,
    role: gatekeeper ? gatekeeper.role : drill.voicemail ? 'voicemail' : 'owner',
    gatekeeperHow: gatekeeper?.how || '',
    personalityId,
    personalityLabel: personality?.label || gatekeeper?.role || 'voicemail',
    personalityHow: personality?.how || '',
    biz,
    trueThing: trueThing.brief(biz),
    trueThingPain: trueThing.pain,
    situation,
    pains,
    yesKey,
    decider,
    objections: objections.map((k) => ({ key: k, line: OBJECTIONS[k] })),
    pickup,
  };
  scenario.brief = briefFor(scenario, { firstRound });

  remember('drills', drill.id);
  remember('trades', trade.id);
  if (personalityId) remember('personalities', personalityId);
  remember('names', speaker.first);
  if (!remote) remember('towns', where.town);
  remember('trueThings', trueThingIdx);
  return scenario;
}

// The spoken brief before he dials: what a rep would know from the lead list and a 30-second look at Google.
export function briefFor(s, { firstRound = true } = {}) {
  const drill = DRILL_BY_ID[s.drill];
  const place = s.biz.remote ? `${s.biz.town}, ${s.biz.state}` : s.biz.town;
  const ownerName = `${s.owner.first} ${s.owner.last}`;
  const parts = [`Drill: ${drill.name}.`];
  if (drill.gatekeeper) {
    parts.push(`You're calling ${s.biz.name}, ${article(s.biz.trade.label)} ${s.biz.trade.label} in ${place}, for the owner, ${ownerName}. Someone else picks up.`);
  } else if (drill.voicemail) {
    parts.push(`You're calling ${ownerName} at ${s.biz.name}, ${article(s.biz.trade.label)} ${s.biz.trade.label} in ${place}. You'll get the voicemail.`);
  } else {
    parts.push(`You're calling ${ownerName}, who owns ${s.biz.name}, ${article(s.biz.trade.label)} ${s.biz.trade.label} in ${place}.`);
  }
  parts.push(`Your one true thing: ${s.trueThing}.`);
  if (s.biz.remote) parts.push(`They're on ${s.biz.tz} time, so the meeting is a phone call from your cell.`);
  parts.push(`Goal: ${drill.goal}.`);
  parts.push(firstRound ? 'Say ready to dial, or menu to pick a different drill. Say coach any time to stop and get feedback.' : 'Say ready to dial.');
  return parts.join(' ');
}

export { money };
