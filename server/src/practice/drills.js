// The drills. Each one is a kind of practice call with its own goal, its own way for the prospect to
// behave, and its own things the coach scores. Modelled on Wyatt's own drill sheet
// (biggify-platform docs/sales/03-role-play-drills.md), the call card and cold-call script v3 (2026-11-12).

export const DRILLS = [
  {
    id: 'full',
    num: 1,
    name: 'full cold call',
    weight: 30,
    personalities: ['busy_gruff', 'friendly_noncommittal', 'burned_skeptic', 'price_shopper', 'has_a_guy', 'email_brushoff', 'chatty_curious', 'old_school', 'analytical', 'partner_decides', 'guarded_short', 'not_interested', 'suspicious'],
    goal: 'book the 15-minute meeting',
    actor:
      'A whole cold call, start to finish. Play it straight: react to the opener the way this person would, raise one or two of your objections when they come up naturally (not all at once), answer questions in character, and reveal hidden pains only when asked good open questions. If the rep earns it (see WHAT MAKES YOU SAY YES), agree to a specific day and time, and give the number to text the confirmation to if asked. The scene ends when a meeting time is agreed and confirmed, when you hang up, or when the rep wraps up.',
    rubric:
      'Opener: straight from his name into "the reason I\'m calling" with no pause, the one true thing and why it matters to them (a "because"), a true compliment, ending on an easy question about their business rather than a time grab; no apology, no banned lines. Two or three good questions, with acknowledge-compliment-ask after each answer, and the money math with their own numbers if missed calls come up. What I do in one breath when asked; the price only on the second "how much?"; "does it work?" answered with the written lead guarantee and all its conditions in the same breath, or honestly without it. One true why-now reason, once. Objections: one turnaround, then accept the second no. The ask: 15 minutes, "I don\'t know yet if it\'s a fit", ONE specific time, then silence. After the yes: who else decides, call or email, reminder text OK, the number, then off the phone.',
    maxRepTurns: 18,
  },
  {
    id: 'objections',
    num: 2,
    name: 'objection gauntlet',
    weight: 15,
    personalities: ['burned_skeptic', 'price_shopper', 'has_a_guy', 'email_brushoff', 'old_school', 'analytical', 'not_interested'],
    goal: 'handle every objection and still book the meeting',
    actor:
      'An objection gauntlet. After the rep\'s opener, hit them with objections one after another: use the GAUNTLET list in order, one objection per reply, worded naturally. If the rep handles one well (calm, agrees or labels it, asks a question, goes back to the meeting once), move to the next one. If they fumble it, push on the same one once more before moving on. After the last objection, if the rep handled most of them well, agree to a meeting time; if not, end it ("Yeah, I don\'t think so. Take care."). Keep each reply to one or two sentences.',
    rubric:
      'Each objection, one by one, against the v3 turnaround: agree, say the unexpected, ask once more with ONE specific time ("How about Thursday at 10?"). Only one turnaround per objection, then accept the second no. "How much?": plan differences the first time, the price straight the second. "Does it work?": the written lead guarantee with all its conditions in the same breath, or honestly without it. Never arguing, never a discount, a free trial, a guarantee without its conditions or a client result. Still asking for the 15 minutes with one specific time.',
    maxRepTurns: 14,
    gauntlet: true,
  },
  {
    id: 'gatekeeper',
    num: 3,
    name: 'gatekeeper',
    weight: 12,
    gatekeeper: true,
    goal: 'get through to the owner, or get the owner\'s name and the best time to call back',
    actor:
      'You are NOT the owner: you are the gatekeeper described in WHO YOU ARE. The owner is out or busy. Screen the call the way your role would: "What\'s this regarding?" "Is this a sales call?" "Can I take a message?" If the rep is honest (says plainly it\'s about the Google listing, never pretends to be a customer or says it\'s about a job), polite and quick, give the owner\'s first name, the best time to catch them, or offer to put them through ("Hang on, let me see if he\'s free"). If they dodge, pretend to be a customer, get short with you, or ramble and pitch you on their services, get colder: "He doesn\'t take sales calls. I can take a message." You are not the buyer, so never ask the rep what he found or what he would do; you only route the call. The scene ends when you offer to put them through, give a callback time, take a message, or hang up.',
    rubric:
      'Honesty (never pretending to be a customer, never saying it\'s about a job), a short truthful reason ("about their Google listing"), politeness and respect for the gatekeeper, asking for the owner\'s name and the best time to catch them, leaving name and number. No getting short.',
    maxRepTurns: 10,
  },
  {
    id: 'opener',
    num: 4,
    name: 'opener reps',
    weight: 12,
    personalities: ['busy_gruff', 'not_interested', 'guarded_short', 'suspicious', 'friendly_noncommittal', 'burned_skeptic', 'analytical'],
    goal: 'nail the first 20 seconds',
    actor:
      'Opener reps: only the first few seconds of a call matter. React to the rep\'s opener honestly, the way this person would in real life: if it was clear, short and specific (name, straight into the reason he is calling, one true thing about your business and why it matters to you, then an easy question about your business), show a flicker of interest and answer the question briefly ("Uh, I guess so. Why?"). If he asks for a meeting time before you even know why he called, get colder. If it was vague, long, apologetic or salesy, get colder ("What are you selling?" / "Not interested."). Keep it to one short line per reply. After the rep\'s third line at most, end the scene with one last natural line.',
    rubric:
      'Only the opener, 15 to 20 seconds: name, then straight into "the reason I\'m calling" with no pause; the one true thing said plainly without judgment, and why it matters to them (a "because"); a true compliment; ending on an easy question about their business, NOT a meeting time in the first breath; a confident, friendly tone with no apology; no "me" words (walk you through, show you, tell you about) and none of the banned lines; stopping to listen afterwards. Mention how many words the first line was.',
    maxRepTurns: 3,
    endAfterRepTurns: 3,
  },
  {
    id: 'close',
    num: 5,
    name: 'booking the meeting',
    weight: 10,
    personalities: ['friendly_noncommittal', 'chatty_curious', 'email_brushoff', 'partner_decides', 'old_school'],
    goal: 'turn a maybe into a specific day and time',
    actor:
      'Booking drill. You are already warm: the rep\'s opener got your interest ("Oh yeah? What did you find?"). But you are slippery about committing: "maybe next week sometime", "send me something first", "I\'d have to check with my wife", "I\'m pretty busy". Give in to a specific day and time only if the rep offers one specific day and time ("How about Thursday at 10?"), handles your stall once, and then goes quiet and lets you answer. If he offers vague times ("sometime this week?") or asks "what\'s a good time for you?", stay vague. When a time is agreed and the rep asks for a number to text the confirmation to, give it. The scene ends when the meeting is set and confirmed, or when it fizzles.',
    rubric:
      'Getting a specific day AND time (not "sometime next week"): 15 minutes, ONE specific time, then silence (a second time only as the fallback), never "what\'s a good time for you?". Handling the stall once without pressure or fake deadlines; one honest why-now reason at most. After the yes: who else decides (bring the spouse in now), call or email, reminder text OK, the number for the confirmation, then thanking them and getting off the phone fast. Talking past the yes is a mistake.',
    maxRepTurns: 12,
  },
  {
    id: 'discovery',
    num: 6,
    name: 'discovery questions',
    weight: 10,
    personalities: ['guarded_short', 'old_school', 'chatty_curious', 'has_a_guy', 'friendly_noncommittal'],
    goal: 'find their real problems before you ask for the meeting',
    actor:
      'Discovery drill. You let the rep talk to you and you answer questions truthfully from your hidden details, but you never volunteer anything: closed questions get short answers, good open questions get a real answer, and a good follow-up on your answer gets a deeper one (that is how hidden pains come out). If the rep starts pitching before asking about you, lose interest. When the rep asks for the meeting, say yes only if they uncovered at least one of your hidden pains and tied the meeting to it; otherwise stall. The scene ends when the meeting is set or refused.',
    rubric:
      'The questions: open, one at a time, with acknowledge-compliment-ask after each answer (say back what they said, compliment something true, then the next question), following up on the answers and using their own words back. A trigger question (what\'s changed lately). The money math if missed calls or slow weeks come up: their numbers only, rounded down, them agreeing at each step, never implying we win it all back. "What would you change about it?", never "what do you like about your current...". Which hidden pains were found and which were missed. Not pitching the moment a problem comes up. Tying the 15-minute ask to what they said. Talk ratio: the prospect should talk more than the rep.',
    maxRepTurns: 16,
  },
  {
    id: 'hotseat',
    num: 7,
    name: 'hot seat',
    weight: 6,
    personalities: ['angry', 'suspicious', 'on_a_job', 'not_interested'],
    goal: 'stay calm and do the right thing with an angry, suspicious or busy owner',
    actor:
      'Hot seat: a hard, emotional call. Play your personality at full strength from the first line. Angry: demand they never call again. Suspicious: grill them about where they got your number and whether it\'s a scam. On a job: you have ten seconds. Not interested: you are already moving the phone away from your ear. React to how the rep handles it: calm, honest and quick earns a little respect (a callback time, a calmer tone, "fine, send it"); arguing, dodging or pushing gets you yelling or hanging up. The scene ends fast either way.',
    rubric:
      'Calm voice. Accepting a "don\'t call me" at once ("Understood, I\'ll take you off right now, sorry to bother you") with no "can I just say one thing". Telling the truth about where the number came from (the county\'s public business records), full name and Biggify, and offering to take them off. On a job: off the phone in under 20 seconds with a callback time before 8 pm ("Is 4:30 today good, or tomorrow at 9?"). A bad day: "I\'ll email you what I found and you can look whenever. Fair?" Never contacting someone again who said not to.',
    maxRepTurns: 6,
  },
  {
    id: 'voicemail',
    num: 8,
    name: 'voicemail',
    weight: 5,
    personalities: ['busy_gruff'],
    voicemail: true,
    goal: 'leave a live voicemail in under 30 seconds',
    actor: 'Voicemail: nothing to act. The rep is leaving a message.',
    rubric:
      'The v3 voicemail: live and under 30 seconds (about 75 words or fewer). Name and Biggify; his number 941-401-8288 said twice at the START and twice at the END, slowly; "the reason I\'m calling": the one true thing about how they show up on Google next to the other [trade]s in their town; a reason to call back ("Let\'s grab 15 minutes this week"). Not a pitch, no AI or software talk, no local claim out of state, nothing that can\'t be backed up. Count how many times he said the number.',
    maxRepTurns: 4,
  },
];

export const DRILL_BY_ID = Object.fromEntries(DRILLS.map((d) => [d.id, d]));

// Spoken menu, kept short for a phone.
export const MENU_TEXT =
  'Say a number. One, full cold call. Two, objection gauntlet. Three, gatekeeper. Four, opener reps. Five, booking the meeting. Six, discovery questions. Seven, hot seat. Eight, voicemail. Or say random.';

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

// What drill did he ask for? Returns a drill id, 'random', or null. Checks names first, then a lone number.
export function parseDrillChoice(text = '') {
  const t = ` ${String(text).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')} `;
  if (/ (random|surprise me|any|whatever|you pick|dealer'?s choice) /.test(t)) return 'random';
  if (/ (full|whole|complete) (cold )?call /.test(t) || / cold call /.test(t)) return 'full';
  if (/ (objection|objections|gauntlet) /.test(t)) return 'objections';
  if (/ gate ?keeper /.test(t)) return 'gatekeeper';
  if (/ (opener|openers|opening|first ten|first 10) /.test(t)) return 'opener';
  if (/ (booking|book the meeting|close|closing|the meeting) /.test(t)) return 'close';
  if (/ (discovery|questions) /.test(t)) return 'discovery';
  if (/ (hot ?seat|angry|suspicious) /.test(t)) return 'hotseat';
  if (/ (voicemail|voice mail) /.test(t)) return 'voicemail';
  const words = t.trim().split(' ');
  // A lone number ("two", "number 3", "let's do four") — only in short replies, so "I have two trucks" is not a menu pick.
  if (words.length <= 4) {
    for (const w of words) {
      const n = /^\d$/.test(w) ? Number(w) : NUMBER_WORDS[w];
      if (n && n >= 1 && n <= DRILLS.length) return DRILLS.find((d) => d.num === n).id;
    }
  }
  return null;
}
