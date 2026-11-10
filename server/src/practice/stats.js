// Things code can measure about a practice run, handed to the coach as facts (the model is not asked
// to count words).

const BANNED = [
  ['out of the blue', /out of the blue/i],
  ['do you have 30 seconds', /(30|thirty) seconds|a quick (second|minute)\?/i],
  ['tell me to get lost', /get lost/i],
  ['how are you', /how are you|how's it going|how you doing/i],
  ['did I catch you at a bad time', /bad time/i],
  ['guarantee', /guarantee/i],
  ['a ranking promise', /number one|#1|top of google|first page|top three|top 3/i],
  ["you don't have a website", /you don'?t have a (web)?site/i],
  ["you're losing jobs", /losing (jobs|business|customers|money)/i],
  ['we just helped a company like yours', /we just helped|a company like yours/i],
];

const TIME_REF = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|this afternoon|this morning|tonight|later today|next week|noon|\d{1,2}(:\d\d)?\s?(am|pm|a\.m\.|p\.m\.)|\d{1,2} o'?clock|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)( thirty)? (am|pm|a\.m\.|p\.m\.|o'?clock))\b/gi;

const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

export function computeStats(turns = []) {
  const rep = turns.filter((t) => t.who === 'rep');
  const prospect = turns.filter((t) => t.who !== 'rep');
  const repWords = rep.reduce((s, t) => s + words(t.text), 0);
  const prospectWords = prospect.reduce((s, t) => s + words(t.text), 0);
  const all = rep.map((t) => t.text).join(' ');
  return {
    repWords,
    prospectWords,
    repShare: repWords + prospectWords ? Math.round((repWords / (repWords + prospectWords)) * 100) : 0,
    firstLineWords: rep.length ? words(rep[0].text) : 0,
    longestRepTurn: rep.reduce((m, t) => Math.max(m, words(t.text)), 0),
    questions: (all.match(/\?/g) || []).length,
    offeredTwoTimes: rep.some((t) => (t.text.match(TIME_REF) || []).length >= 2 && /\bor\b/i.test(t.text)),
    askedForNumber: rep.some((t) => /(best|good|right) number|number (to|i can|i should) text|text (you )?(the|a) confirmation|confirmation text|text (it|that) to/i.test(t.text)),
    banned: BANNED.filter(([, re]) => re.test(all)).map(([label]) => label),
  };
}
