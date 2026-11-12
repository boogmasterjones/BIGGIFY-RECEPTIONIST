// Things code can measure about a practice run, handed to the coach as facts (the model is not asked
// to count words). Graded against the cold-call script v3 (Hubert docs/sales/CALL_SCRIPT_v3_2026-11-12.md).

// The written Tier 2 lead guarantee may be said, but only with its conditions in the same breath:
// 4 stars or better, 20 reviews, one in the last 90 days, call tracking hooked up. Any sentence turn
// that says "guarantee" without at least three of those four is flagged; "guaranteed results",
// "guaranteed rankings" and "money back" are flagged always.
const GUARANTEE_CONDITIONS = [/\b(4|four)[- ]stars?\b/i, /\b(20|twenty) reviews\b/i, /\b(90|ninety)[- ]days?\b/i, /call tracking/i];
const GUARANTEE_ALWAYS_BAD = /guarantee(d|s)? (results|rankings?|(the )?(top|first|number one|#1))|money[- ]back|guarantee(d)? (you )?(more|\d+) (calls|leads|jobs|customers)/i;

export function guaranteeProblem(text = '') {
  const t = String(text);
  if (GUARANTEE_ALWAYS_BAD.test(t)) return true;
  if (!/guarantee/i.test(t)) return false;
  // "I never guarantee a ranking" / "nobody can guarantee you number one" are fine.
  if (/\b(never|can'?t|cannot|won'?t|don'?t|nobody can|no one can)\b[^.?!]{0,30}guarantee/i.test(t) && !/lead number|in writing/i.test(t)) return false;
  return GUARANTEE_CONDITIONS.filter((re) => re.test(t)).length < 3;
}

const BANNED = [
  ['out of the blue', /out of the blue/i],
  ['do you have 30 seconds', /(30|thirty) seconds|a quick (second|minute)\?/i],
  ['tell me to get lost', /get lost/i],
  ['how are you', /how are you|how's it going|how you doing/i],
  ['did I catch you at a bad time', /catch you at a bad time|is this a bad time/i],
  ['is this a good time', /is this a good time|is now a good time/i],
  ["what's a good time for you", /what'?s a good time (for you)?|when'?s a good time for you/i],
  ['walk you through / show you / tell you about', /walk you through|(like|love|want) to show you|i'?d like to tell you about|tell you (a little )?about (what we|us|biggify)/i],
  ['I understand', /\bI understand\b/i],
  ["it's a tax write-off", /tax write[- ]?off/i],
  ['best service and support', /best service and support/i],
  ['earn your business', /earn your business/i],
  ['what do you like about your current…', /what do you like about (your|the) current/i],
  ['mind if I check in', /mind if I check in/i],
  ['free consultation', /free consultation/i],
  ['a free trial', /free (30[- ]day |thirty[- ]day )?trial|try it free/i],
  ['a ranking promise', /(get|put|have) you (to |at |on )?(number one|#1|the top|first page|page one)|top of google|top three|top 3/i],
  ["you don't have a website", /you don'?t have a (web)?site/i],
  ["you're losing jobs", /(you'?re|you are) losing (jobs|business|customers|money)/i],
  ['we just helped a company like yours', /we just helped|a company like yours/i],
  ['a client result quoted', /rock solid[^.?!]*(\d+ (calls|leads|jobs)|doubled|tripled|up \d+)/i],
  ['Rock Solid Tile without the family disclosure', { test: (t) => /rock solid/i.test(t) && !/family/i.test(t) }],
];

// "SEO" as an opener: in the first rep line only.
const SEO_OPENER = /\bS\.?E\.?O\.?\b|search engine optimi[sz]ation/i;

const TIME_REF = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|this afternoon|this morning|tonight|later today|next week|noon|\d{1,2}(:\d\d)?\s?(am|pm|a\.m\.|p\.m\.)|\d{1,2} o'?clock|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)( thirty)? (am|pm|a\.m\.|p\.m\.|o'?clock))\b/gi;
// A specific day AND an hour: "Thursday at 10", "tomorrow at 9", "4:30 today".
const SPECIFIC_TIME = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b[^.?!]{0,12}\b(at )?\d{1,2}(:\d\d)?\b|\b\d{1,2}(:\d\d)?\s?(am|pm)?\s(today|tomorrow|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today) at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon)\b/i;

const PRICE_ASK = /how much|what('?s| does| do| is)[^.?!]{0,20}(cost|price|charge)|ballpark|what are your (rates|prices)|price\?/i;
const PRICE_SAID = /\$\s?\d|\b\d{3,4} (a|per) month\b|\b\d+ (dollars|bucks)\b|\b(six|seven|eight|nine) (ninety[- ]seven|hundred)\b|\b(697|997|897|1,?297)\b/i;

const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const OUR_NUMBER = /941[\s.-]*401[\s.-]*8288|401[\s.-]*8288|four oh one,? eight two eight eight|four zero one,? eight two eight eight/gi;

export function computeStats(turns = []) {
  const rep = turns.filter((t) => t.who === 'rep');
  const prospect = turns.filter((t) => t.who !== 'rep');
  const repWords = rep.reduce((s, t) => s + words(t.text), 0);
  const prospectWords = prospect.reduce((s, t) => s + words(t.text), 0);
  const all = rep.map((t) => t.text).join(' ');
  const first = rep.length ? String(rep[0].text) : '';

  // Price said before the prospect asked twice?
  let asks = 0;
  let priceTooEarly = false;
  let priceAsks = 0;
  for (const t of turns) {
    if (t.who === 'rep') {
      if (PRICE_SAID.test(t.text) && asks < 2) priceTooEarly = true;
    } else if (PRICE_ASK.test(t.text)) {
      asks++;
      priceAsks++;
    }
  }

  const banned = BANNED.filter(([, re]) => re.test(all)).map(([label]) => label);
  // 'In the same breath': each turn that says guarantee must carry its conditions itself.
  if (rep.some((t) => guaranteeProblem(t.text))) banned.push('the lead guarantee without its conditions');
  if (SEO_OPENER.test(first)) banned.push('SEO as an opener');
  if (priceTooEarly) banned.push('a price before the second "how much?"');

  return {
    repWords,
    prospectWords,
    repShare: repWords + prospectWords ? Math.round((repWords / (repWords + prospectWords)) * 100) : 0,
    firstLineWords: rep.length ? words(first) : 0,
    longestRepTurn: rep.reduce((m, t) => Math.max(m, words(t.text)), 0),
    questions: (all.match(/\?/g) || []).length,
    // Kept for Hubert's Sales drilling tab (its schema knows this key). v3 grades on ONE specific time.
    offeredTwoTimes: rep.some((t) => (t.text.match(TIME_REF) || []).length >= 2 && /\bor\b/i.test(t.text)),
    offeredOneTime: rep.some((t) => SPECIFIC_TIME.test(t.text)),
    askedForNumber: rep.some((t) => /(best|good|right) number|number (to|i can|i should) text|text (you )?(the|a) confirmation|confirmation text|text (it|that) to/i.test(t.text)),
    // v3 opener checks.
    reasonInFirstLine: /reason I'?m calling|reason for (my|the) call/i.test(first),
    becauseInFirstLine: /\bbecause\b|that'?s one of the first things|which (means|matters)|that matters/i.test(first),
    timeInFirstLine: SPECIFIC_TIME.test(first) || (first.match(TIME_REF) || []).length >= 2,
    questionInFirstLine: /\?/.test(first),
    numberSaidTimes: (all.match(OUR_NUMBER) || []).length,
    priceAsks,
    priceTooEarly,
    banned,
  };
}
