// Voices for the cold-call practice line. One is picked at random for every call (a coin flip for
// male or female first, then a voice of that gender), and the practice prospect's name and gender
// always follow the voice.
//
// Only names we could check are listed (2026-11-09):
//   - live-tested on 646-3030 by the owner (2026-11-05/07): astra, luna, celeste, hera, Natural.abbie
//   - Telnyx's ConversationRelay docs use Telnyx.Natural.abbie, Telnyx.NaturalHD.astra and
//     Telnyx.NaturalHD.albion as examples, and Telnyx's NaturalHD table lists albion as en-US male
//   - Telnyx's own GitHub plugin (team-telnyx/telnyx-openclaw-tts) lists orion ("male, deep and
//     authoritative") and andersen_johan ("male, professional"); team-telnyx/telnyx-hermes-tts lists
//     orion and celeste as NaturalHD voices
// The male voices were never heard on a real call yet. If one turns out silent (the way
// Telnyx.Ultra.Callie was), the line notices and stops picking it (see markVoiceResult), and
// PRACTICE_VOICES can replace the whole list without a code change:
//   PRACTICE_VOICES=Telnyx.NaturalHD.luna:f,Telnyx.NaturalHD.orion:m,...

export const DEFAULT_VOICES = [
  { id: 'Telnyx.NaturalHD.luna', gender: 'f' },
  { id: 'Telnyx.NaturalHD.celeste', gender: 'f' },
  { id: 'Telnyx.NaturalHD.hera', gender: 'f' },
  { id: 'Telnyx.NaturalHD.astra', gender: 'f' },
  { id: 'Telnyx.Natural.abbie', gender: 'f' },
  { id: 'Telnyx.NaturalHD.albion', gender: 'm' },
  { id: 'Telnyx.NaturalHD.orion', gender: 'm' },
  { id: 'Telnyx.NaturalHD.andersen_johan', gender: 'm' },
];

const VOICE_ID = /^Telnyx\.[A-Za-z0-9]+\.[A-Za-z0-9_-]+$/;

// "Telnyx.NaturalHD.luna:f, Telnyx.NaturalHD.orion:m" -> [{ id, gender }]. Bad entries are skipped;
// an empty or useless value falls back to the defaults.
export function parseVoiceList(raw) {
  if (!raw || typeof raw !== 'string') return DEFAULT_VOICES;
  const out = [];
  for (const part of raw.split(',')) {
    const [id, g] = part.trim().split(':').map((s) => (s || '').trim());
    const gender = /^m/i.test(g || '') ? 'm' : /^f/i.test(g || '') ? 'f' : '';
    if (VOICE_ID.test(id || '') && gender) out.push({ id, gender });
  }
  return out.length ? out : DEFAULT_VOICES;
}

export function practiceVoices() {
  return parseVoiceList(process.env.PRACTICE_VOICES || '');
}

// --- Silent-voice guard -------------------------------------------------------------------------
// Telnyx tells the socket when the AI voice starts talking (agentSpeaking on, asked for with
// events="speaker-events"). A call where we sent words and that never happened was dead air: that
// voice is skipped until the server restarts. A voice is only judged once we have seen the event
// work at least once (so a Telnyx change to the events can't knock out every voice).
const badVoices = new Map(); // id -> when it was flagged
let speakerEventsSeen = false;

export function markVoiceResult(voiceId, { spoke, sentText, seconds }) {
  if (!voiceId) return;
  if (spoke) {
    speakerEventsSeen = true;
    if (badVoices.delete(voiceId)) console.log(`[practice] voice ${voiceId} works again`);
    return;
  }
  if (speakerEventsSeen && sentText && seconds >= 8) {
    badVoices.set(voiceId, new Date().toISOString());
    console.warn(`[practice] voice ${voiceId} never spoke on a ${Math.round(seconds)} s call: skipping it from now on (remove it from PRACTICE_VOICES if it stays silent)`);
  }
}

export function voiceHealth() {
  return { speakerEventsSeen, bad: Object.fromEntries(badVoices) };
}

export function resetVoiceHealth() {
  badVoices.clear();
  speakerEventsSeen = false;
}

// Pick a voice: male or female at random, never the voice used on the last call when there is
// another one, never a voice that went silent unless it is the only one of that gender left.
export function pickVoice({ recent = [], rand = Math.random, voices = practiceVoices() } = {}) {
  const genders = [...new Set(voices.map((v) => v.gender))];
  const gender = genders.length > 1 ? (rand() < 0.5 ? 'm' : 'f') : genders[0];
  let pool = voices.filter((v) => v.gender === gender);
  const healthy = pool.filter((v) => !badVoices.has(v.id));
  if (healthy.length) pool = healthy;
  const fresh = pool.filter((v) => v.id !== recent[recent.length - 1]);
  if (fresh.length) pool = fresh;
  return pool[Math.floor(rand() * pool.length)];
}
