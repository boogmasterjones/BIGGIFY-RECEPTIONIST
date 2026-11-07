import { config } from './config.js';
import { greetingFor } from './prompt.js';

// Telnyx answer markup (TeXML) that connects a call to our ConversationRelay socket.
// Telnyx voices are named "Telnyx.<model>.<name>"; a business row may still carry an
// old Twilio/Google voice id, which Telnyx would not know, so only a Telnyx voice is
// taken from the row and everything else falls back to TELNYX_VOICE.

function escapeXml(s = '') {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

// A voice can also be picked per Telnyx application with ?voice=Telnyx.X.Y on its
// voice URL, so trying voices only needs a change in the Telnyx portal, not a deploy.
const TELNYX_VOICE = /^Telnyx\.[A-Za-z0-9]+\.[A-Za-z0-9_-]+$/;

export function telnyxVoiceFor(business, override = '') {
  if (typeof override === 'string' && TELNYX_VOICE.test(override)) return override;
  const v = business?.voice || '';
  return TELNYX_VOICE.test(v) ? v : config.telnyx.voice;
}

// Ring the business's own phone first. If nobody picks up within RING_SECONDS, Telnyx
// asks /incoming-call-telnyx/after-dial what to do, and that hands the call to the
// receptionist. Kept under ~20 s so the call reaches us before a cell's own voicemail.
const RING_SECONDS = 18;

export function telnyxRingFirst(business, publicUrl, voiceOverride = '', dialedNumber = '') {
  const base = publicUrl || `http://localhost:${config.port}`;
  const qs = new URLSearchParams();
  if (dialedNumber) qs.set('to', dialedNumber);
  if (voiceOverride) qs.set('voice', voiceOverride);
  const action = `${base}/incoming-call-telnyx/after-dial${qs.toString() ? `?${qs}` : ''}`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Dial timeout="${RING_SECONDS}" answerOnBridge="true" action="${escapeXml(action)}" method="POST">` +
    `<Number>${escapeXml(business.ringFirst)}</Number>` +
    `</Dial>` +
    `</Response>`
  );
}

// `dialedNumber` rides on the socket URL (?to=): Telnyx's setup message carries no `to`
// (Render logs, 2026-11-05/06: every Telnyx call arrived as "to null -> Biggify"), so
// without it the socket could not tell which business the call is for.
export function telnyxAnswer(business, publicUrl, voiceOverride = '', dialedNumber = '') {
  const base = (publicUrl ? publicUrl.replace(/^http/, 'ws') : `ws://localhost:${config.port}`) + '/ws';
  const wsUrl = dialedNumber ? `${base}?to=${encodeURIComponent(dialedNumber)}` : base;
  // Only clear speech may cut the receptionist off (a cough or road noise must not).
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${escapeXml(wsUrl)}"` +
    ` welcomeGreeting="${escapeXml(greetingFor(business))}"` +
    ` voice="${escapeXml(telnyxVoiceFor(business, voiceOverride))}"` +
    ` language="en"` +
    ` transcriptionProvider="${escapeXml(config.telnyx.transcriptionProvider)}"` +
    ` interruptible="speech"` +
    // The greeting is short and always plays to the end: echo from a speakerphone was cutting it off after two words.
    ` welcomeGreetingInterruptible="none"` +
    // agentSpeaking on/off tells us when the goodbye has finished playing (see index.js).
    ` events="speaker-events" />` +
    `</Connect>` +
    `</Response>`
  );
}
