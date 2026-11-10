// Raw material for practice prospects: the people, trades, towns and situations Wyatt actually calls
// (county tax-roll trades in SW Florida, plus the out-of-state metros on his lists). Everything here
// is made up for practice: no real business, no real person.

export const MALE_NAMES = [
  'Dave', 'Mike', 'Steve', 'Rick', 'Tony', 'Brian', 'Gary', 'Jeff', 'Kevin', 'Chris', 'Mark', 'Doug',
  'Ray', 'Carlos', 'Luis', 'Travis', 'Cody', 'Wayne', 'Bobby', 'Scott', 'Jason', 'Derek', 'Phil', 'Ron',
  'Hector', 'Dale', 'Shane', 'Marcus', 'Greg', 'Tom',
];
export const FEMALE_NAMES = [
  'Lisa', 'Karen', 'Michelle', 'Tina', 'Denise', 'Angela', 'Brenda', 'Jen', 'Maria', 'Rosa', 'Kim',
  'Sherry', 'Tammy', 'Nicole', 'Amanda', 'Donna', 'Heather', 'Crystal', 'Gina', 'Pam', 'Diane',
  'Carla', 'Jess', 'Rachel', 'Linda', 'Dawn', 'Stacy', 'Tracy', 'Vanessa', 'Laura',
];
export const SURNAMES = [
  'Kowalski', 'Hendricks', 'Morales', 'Baker', 'Delgado', 'Pruitt', 'Sullivan', 'Novak', 'Reyes',
  'Whitaker', 'Castillo', 'Brennan', 'Lindqvist', 'Harmon', 'Ortega', 'McAllister', 'Duval', 'Fischer',
  'Grady', 'Romano', 'Tate', 'Vargas', 'Pickett', 'Holloway', 'Szabo', 'Rhodes', 'Marsh', 'Coleman',
];

// Business-name word for a place ("Gulf Coast Pools").
const PLACE_WORDS = ['Gulf Coast', 'Suncoast', 'Peace River', 'Paradise', 'Island', 'Bayside', 'Palm', 'Coastal', 'Southern', 'Precision', 'Elite', 'Family', 'Hometown', 'Sunshine', 'Tri-County', 'Five Star'];

// value: a typical job in dollars; ticket: how the job value feels to the owner.
export const TRADES = [
  { id: 'tile', label: 'tile installer', noun: 'Tile', search: 'tile installers', value: [4000, 18000], core: true },
  { id: 'flooring', label: 'flooring contractor', noun: 'Flooring', search: 'flooring contractors', value: [3000, 15000], core: true },
  { id: 'remodel', label: 'remodeling contractor', noun: 'Remodeling', search: 'remodelers', value: [15000, 90000], core: true },
  { id: 'builder', label: 'custom home builder', noun: 'Builders', search: 'home builders', value: [250000, 900000], core: true },
  { id: 'design', label: 'interior designer', noun: 'Interiors', search: 'interior designers', value: [8000, 60000], core: true },
  { id: 'pavers', label: 'paver and patio contractor', noun: 'Pavers', search: 'paver contractors', value: [6000, 30000], core: true },
  { id: 'pool', label: 'pool builder', noun: 'Pools', search: 'pool builders', value: [45000, 110000], core: true },
  { id: 'screen', label: 'screen enclosure contractor', noun: 'Screen Enclosures', search: 'screen enclosure companies', value: [8000, 35000], core: true },
  { id: 'fence', label: 'fence contractor', noun: 'Fence', search: 'fence companies', value: [3500, 14000], core: true },
  { id: 'deck', label: 'deck builder', noun: 'Decks', search: 'deck builders', value: [9000, 40000], core: true },
  { id: 'roofing', label: 'roofer', noun: 'Roofing', search: 'roofers', value: [9000, 30000], core: false },
  { id: 'hvac', label: 'AC and heating contractor', noun: 'Air', search: 'AC repair', value: [400, 12000], core: false },
  { id: 'plumbing', label: 'plumber', noun: 'Plumbing', search: 'plumbers', value: [300, 8000], core: false },
  { id: 'electric', label: 'electrician', noun: 'Electric', search: 'electricians', value: [400, 9000], core: false },
  { id: 'painting', label: 'painter', noun: 'Painting', search: 'painters', value: [2500, 12000], core: false },
  { id: 'landscape', label: 'landscaper', noun: 'Landscaping', search: 'landscapers', value: [1500, 20000], core: false },
  { id: 'cabinets', label: 'cabinet and countertop shop', noun: 'Cabinets', search: 'kitchen cabinet companies', value: [8000, 40000], core: true },
  { id: 'pressure', label: 'pressure washing company', noun: 'Pressure Washing', search: 'pressure washing', value: [250, 1500], core: false },
  { id: 'cleaning', label: 'house cleaning company', noun: 'Cleaning', search: 'house cleaners', value: [150, 400], core: false },
];

// Local towns (SW Florida, where Wyatt meets in person) and out-of-state metros (phone call from his cell).
export const LOCAL_TOWNS = ['Port Charlotte', 'Punta Gorda', 'North Port', 'Venice', 'Englewood', 'Cape Coral', 'Fort Myers', 'Sarasota', 'Naples', 'Arcadia', 'Lehigh Acres', 'Bonita Springs', 'Rotonda West', 'Estero'];
export const REMOTE_TOWNS = [
  { town: 'Spokane', state: 'Washington', tz: 'Pacific' },
  { town: 'Spokane Valley', state: 'Washington', tz: 'Pacific' },
  { town: 'Mesa', state: 'Arizona', tz: 'Arizona (Mountain)' },
  { town: 'Gilbert', state: 'Arizona', tz: 'Arizona (Mountain)' },
  { town: 'Austin', state: 'Texas', tz: 'Central' },
  { town: 'Round Rock', state: 'Texas', tz: 'Central' },
];

// The "one true thing" Wyatt would have found on their Google listing or website before dialing.
// `pain` is how the owner feels about it if it comes up (hidden; revealed only when asked well).
export const TRUE_THINGS = [
  { brief: (b) => `they have ${b.reviews} Google reviews, and the ${b.trade.search} around them have between ${b.compLow} and ${b.compHigh}`, pain: 'knows the competitor down the road "has a ton of reviews" and it bugs them, but never asks customers for reviews' },
  { brief: () => 'their Google listing shows no business hours', pain: 'had no idea the hours were missing; a customer once said "I didn\'t know if you were open"' },
  { brief: () => 'their website takes a long time to load on a phone', pain: 'the site was built years ago by a friend; owner never looks at it on a phone' },
  { brief: () => 'the last post on their Google listing is from two years ago', pain: 'thought posting on Google was "a Facebook thing"' },
  { brief: () => 'their Google listing has no link to their website', pain: 'did not know the listing and the website were separate things' },
  { brief: () => 'the newest photo on their Google listing is about three years old', pain: 'has hundreds of job photos on their phone and never does anything with them' },
  { brief: () => 'half their recent Google reviews have no reply from the business', pain: 'feels bad about it, "just never get around to it"' },
  { brief: (b) => `they don't show up in the top three on Google Maps for "${b.trade.search} in ${b.town}"`, pain: 'has noticed a newer competitor showing up everywhere and is annoyed about it' },
];

// Where their work comes from and what marketing they have now (hidden).
export const SITUATIONS = [
  'Almost all work is word of mouth and repeat customers. A nephew built a website years ago. No one touches the Google listing.',
  'Pays for Angi / HomeAdvisor leads, about four hundred a month, and hates it: the leads go to five other companies too.',
  'Paid an agency out of Tampa twelve hundred a month for a year. Got a website and monthly reports full of numbers, but the phone did not ring more. Cancelled six months ago and is still annoyed.',
  'The spouse runs a Facebook page and posts when there is time, which is rarely. No other marketing.',
  'Has a decent website and about thirty reviews. Gets steady work but wants bigger, better-paying jobs instead of small service calls.',
  'Just went out on their own two years ago after working for a bigger company. Hungry for work, very tight on money.',
  'Busy right now, but the slow season is coming and last year it was scary slow from June to September.',
  'Gets work from two builders and a property manager. Worried because one of the builders just slowed way down.',
  'A Yellow Pages-style directory rep sold them an ad package years ago that did nothing. Has not spent a dollar on marketing since.',
  'A local guy does their website for fifty a month. He is a friend from church and hard to fire, even though nothing happens.',
];

// Hidden pain points the prospect only shares if Wyatt asks a good, open question and listens.
export const PAINS = [
  'Misses a lot of calls while on a job, on a roof or under a house; most never call back.',
  'After 5 pm the phone goes to a full voicemail box.',
  'Wants to hire one more crew member but is not sure the work will be there.',
  'Lost two good jobs last month to a competitor who "looks bigger online".',
  'Customers keep saying "I couldn\'t find you on Google" even though they were referred.',
  'Gets too many small, cheap jobs and wants the bigger ones.',
  'Has a ton of happy customers but only a handful of reviews, because nobody asks.',
  'The slow season is coming and there is nothing booked for it.',
  'The spouse is tired of being the one who has to "do the computer stuff".',
  'Thinks about retiring in a few years and wants the business to be worth something.',
];

// What makes this person say yes to a 20-minute meeting (hidden from Wyatt, given to the actor).
export const YES_KEYS = [
  'the rep mentions something specific and true about THEIR business, then asks a question instead of pitching',
  'the rep is short and direct, respects their time, and offers two specific times',
  'the rep is honest when pushed (no guarantees, no made-up results) and does not get pushy',
  'the rep asks where their work comes from and actually listens to the answer',
  'the rep connects the meeting to something they said they want (more of the big jobs, a slower season covered)',
  'the rep handles their main objection calmly and goes back to the meeting only once',
];

// The objections a prospect can raise, worded like a real owner. The cards are Wyatt's flashcards.
export const OBJECTIONS = {
  whats_this: '"What\'s this about?" / "What are you selling?"',
  busy: '"I\'m busy. Not a good time."',
  on_job: '"I\'m on a job right now, man."',
  send_info: '"Just send me some info." / "Send me an email."',
  referrals: '"I get all my work from referrals."',
  not_interested: '"Not interested."',
  scam: '"How\'d you get my number? Is this a scam?"',
  robot: '"Wait, is this a real person? Are you a robot?"',
  have_guy: '"I already have a guy who does that." / "We have an agency."',
  after_season: '"Call me after season." / "It\'s our slow time, no money for that."',
  enough_reviews: '"We already have plenty of reviews. We\'re fine."',
  number_one: '"Can you get me to number one on Google? Do you guarantee it?"',
  price_early: '"How much is it?" (asked early, before anything has been shown)',
  too_expensive: '"That\'s too expensive." / "I can\'t afford marketing right now."',
  burned: '"I tried a marketing company and got burned."',
  spouse: '"I need to talk to my wife / husband / partner."',
  diy: '"I\'ll just do it myself." / "My kid does our Facebook."',
  contract: '"What\'s the catch? Is there a contract?"',
  results: '"Who else do you work with? Can I see results?"',
  not_local: '"You\'re not local. How can you help me from Florida?"',
  think: '"Let me think about it."',
};

// Personalities. `pickup` lines are how they answer the phone ({first} {biz}).
export const PERSONALITIES = {
  busy_gruff: {
    label: 'busy and gruff',
    how: 'Short, flat, distracted. Often one to six words: "Yeah?" "Who\'s this?" "Make it quick." Hates rambling and sales talk. Respects someone who gets to the point in one breath. If the rep rambles past about two sentences without a question, cut them off: "What do you want?"',
    pickup: ['Yeah, this is {first}.', '{biz}.', 'Yeah, hello?', '{first}.'],
    objections: ['busy', 'whats_this', 'not_interested', 'send_info', 'referrals'],
  },
  friendly_noncommittal: {
    label: 'friendly but noncommittal',
    how: 'Warm and easy to talk to, says things like "oh yeah, that sounds interesting", but slides away from any commitment: "maybe sometime", "I\'ll have to look at my calendar", "send me something". Only commits if the rep offers two specific times and asks directly.',
    pickup: ['{biz}, this is {first}, how can I help ya?', 'Hey, this is {first}!', '{biz}, {first} speaking.'],
    objections: ['send_info', 'think', 'spouse', 'after_season'],
  },
  burned_skeptic: {
    label: 'burned before, skeptical',
    how: 'Got burned by a marketing company and is suspicious of anyone who calls. A bit sarcastic. Tests the rep: "Yeah, I\'ve heard that before." "What\'s the catch?" "How are you any different?" Warms up only to honesty, no pressure, and "you own everything". Any hint of a guarantee or hype makes them colder.',
    pickup: ['{biz}.', 'This is {first}.', 'Yeah, {first} here.'],
    objections: ['burned', 'contract', 'number_one', 'results', 'too_expensive'],
  },
  price_shopper: {
    label: 'price shopper',
    how: 'Wants the price right away and keeps coming back to it: "Just tell me what it costs." Compares to cheap options ("my buddy pays fifty bucks a month for his website"). Respects a rep who explains calmly why the price comes after seeing the report, but pushes twice before letting it go.',
    pickup: ['{biz}, this is {first}.', 'Yeah, {first}.', 'Hello, {biz}.'],
    objections: ['price_early', 'too_expensive', 'diy', 'send_info'],
  },
  has_a_guy: {
    label: 'already has a guy',
    how: 'Has someone (a nephew, a friend, an agency) handling marketing and says so right away. Loyal on the surface, but privately not thrilled with what they get. Only admits it if the rep asks what that person actually does for them each month, without knocking them.',
    pickup: ['{biz}, {first}.', 'This is {first}, go ahead.', 'Hello?'],
    objections: ['have_guy', 'referrals', 'not_interested', 'send_info'],
  },
  email_brushoff: {
    label: 'polite "send me an email" brush-off',
    how: 'Polite, busy, and wants the rep off the phone the easy way: "Just send me an email." Says it twice. If the rep agrees and asks once for a short meeting with a specific time, there is a one-in-three chance of "Okay, Thursday\'s fine." If they push a second time after the second brush-off, get short and end it.',
    pickup: ['{biz}, this is {first}.', 'Hi, {first} speaking.', '{biz}, how can I help you?'],
    objections: ['send_info', 'busy', 'think'],
  },
  not_interested: {
    label: 'not interested, ready to hang up',
    how: 'Says "not interested" within the first ten seconds and sounds ready to hang up. Gives ONE more chance only if the rep stays calm and asks a short, curious question (for example whether they get a lot of these calls). Hangs up on any pushiness, any long pitch, or a second ask after a second no.',
    pickup: ['Yeah?', '{biz}.', 'Hello.'],
    objections: ['not_interested', 'whats_this', 'busy'],
  },
  chatty_curious: {
    label: 'curious and chatty',
    how: 'Friendly and talkative, wanders off topic (the hurricane, fishing, a story about a crazy customer, their truck). Genuinely curious, but hard to pin down. The rep has to listen, be kind, and steer back to booking a time. Rewards a rep who uses their words back to them.',
    pickup: ['{biz}, this is {first}, what can I do for ya?', 'Hey, {first} here!', 'Hello, {biz}, {first} speaking.'],
    objections: ['referrals', 'diy', 'spouse', 'think'],
  },
  suspicious: {
    label: 'suspicious, thinks it might be a scam',
    how: 'Immediately suspicious: "How\'d you get my number?" "What company did you say?" "Is this a scam?" Wants plain truth: where the number came from (the county\'s public business records), the rep\'s full name and company. Calms down if answered plainly and offered to be taken off the list; stays prickly if the rep dodges.',
    pickup: ['Who is this?', 'Hello? {first} speaking.', '{biz}.'],
    objections: ['scam', 'robot', 'whats_this', 'not_interested'],
  },
  old_school: {
    label: 'old-school owner',
    how: 'Thirty-plus years in business, all word of mouth, "doesn\'t do the computer". Proud of their reputation. Skeptical of "internet stuff" but softens if the rep shows respect for what they built and talks about reputation and referrals rather than tech. Talks slowly, calls the rep "son" or "young man" now and then.',
    pickup: ['{biz}, this is {first}.', 'Hello, {first} here.', 'Yeah, {biz}.'],
    objections: ['referrals', 'enough_reviews', 'diy', 'spouse'],
  },
  analytical: {
    label: 'analytical, wants specifics',
    how: 'Calm, asks precise questions: "What exactly do you do?" "How do you measure it?" "How many clients do you have?" "What results can you show me?" Respects straight answers, including "I don\'t have results numbers to show yet, and I won\'t make any up." Loses interest at vague or hyped answers.',
    pickup: ['{biz}, {first} speaking.', 'This is {first}.', 'Good morning, {biz}.'],
    objections: ['results', 'number_one', 'contract', 'price_early'],
  },
  on_a_job: {
    label: 'on a job right now',
    how: 'Answers in the middle of a job, distracted and a little out of breath: "Yeah, I\'m on a roof, man." The best rep gets off the phone fast with a specific callback time. If the rep starts pitching anyway, get irritated and hang up.',
    pickup: ['Yeah, hello? Hang on. Yeah, go ahead, I\'m on a job.', '{first}. Make it quick, I\'m on a job.', 'Yeah, I got a sec, I\'m on a roof.'],
    objections: ['on_job', 'busy'],
  },
  angry: {
    label: 'angry, tired of sales calls',
    how: 'Fed up with sales calls. Within seconds: "How did you get this number? Don\'t ever call here again!" The test is whether the rep accepts it at once, calmly, and offers to take them off the list. If the rep argues, explains, or asks "can I just say one thing", yell and hang up.',
    pickup: ['Yeah?', '{biz}.', 'Hello?'],
    objections: ['scam', 'not_interested'],
  },
  partner_decides: {
    label: 'interested, but the spouse or partner decides',
    how: 'Open and interested, but every decision goes through a spouse or business partner: "I\'d have to run it by my wife, she handles all that." The rep has to treat the partner with respect, offer to include them, and still book a specific time.',
    pickup: ['{biz}, this is {first}.', 'Hi, {first} here.', 'Hello, {biz}.'],
    objections: ['spouse', 'think', 'send_info'],
  },
  guarded_short: {
    label: 'guarded, short answers',
    how: 'Not hostile, just guarded. Answers questions honestly but in a few words and volunteers nothing. Opens up a little more each time the rep asks a good open question and follows up on the answer. Closed yes/no questions get one-word answers.',
    pickup: ['{biz}, {first}.', 'This is {first}.', 'Yeah, hello.'],
    objections: ['whats_this', 'referrals', 'send_info'],
  },
};

// Who answers in the gatekeeper drill. `gender` is fixed by the voice, so these are written for either.
export const GATEKEEPERS = [
  { role: 'office manager', how: 'Protective office manager who screens every call. "What\'s this regarding?" "Is this a sales call?" "He doesn\'t take sales calls." Respects honesty and politeness; will give the best time to catch the owner or take a message if asked nicely.', pickup: '{biz}, this is {first}, how can I help you?' },
  { role: 'spouse who answers the business line', how: 'The owner\'s spouse, who answers the business line from home and is protective of their partner\'s time. Friendly at first, cools fast if the rep pretends to be a customer or dodges. "He\'s out on a job, can I take a message?"', pickup: 'Hello, {biz}.' },
  { role: 'front desk receptionist', how: 'Busy front-desk person juggling calls. Not hostile, just wants to route the call: "Is this about a job?" "Can I tell him what it\'s about?" "Want his voicemail?" Will share the owner\'s first name and when they are usually in if asked.', pickup: 'Thank you for calling {biz}, this is {first}, how can I help you?' },
  { role: 'grown son or daughter who works in the business', how: 'The owner\'s grown kid who works in the office. Casual, a bit suspicious of salespeople ("we get like five of these calls a day"). Will help if the rep is straight with them, and might even say they have been telling their parent to fix the Google listing.', pickup: '{biz}, this is {first}.' },
  { role: 'dispatcher', how: 'Dispatcher with a radio going in the background, very short on time: "Who\'s calling? What company? What\'s it about?" Wants the call over in thirty seconds. Gives the owner\'s cell only if the rep was honest and quick; otherwise takes a message.', pickup: '{biz}, dispatch.' },
];
