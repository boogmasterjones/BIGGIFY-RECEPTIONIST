import { config } from './config.js';
import { greetingFor } from './prompt.js';

// Telnyx answer markup (TeXML) that connects a call to our ConversationRelay socket.
// Telnyx voices are named "Telnyx.<model>.<name>"; a business row may still carry an
// old Twilio/Google voice id, which Telnyx would not know, so only a Telnyx voice is
// taken from the row and everything else falls back to TELNYX_VOICE.

function escapeXml(s = '') {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

export function telnyxVoiceFor(business) {
  const v = business?.voice || '';
  return /^Telnyx\./.test(v) ? v : config.telnyx.voice;
}

export function telnyxAnswer(business, publicUrl) {
  const wsUrl = (publicUrl ? publicUrl.replace(/^http/, 'ws') : `ws://localhost:${config.port}`) + '/ws';
  // Only clear speech may cut the receptionist off (a cough or road noise must not).
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${escapeXml(wsUrl)}"` +
    ` welcomeGreeting="${escapeXml(greetingFor(business))}"` +
    ` voice="${escapeXml(telnyxVoiceFor(business))}"` +
    ` language="en"` +
    ` transcriptionProvider="${escapeXml(config.telnyx.transcriptionProvider)}"` +
    ` interruptible="speech"` +
    ` welcomeGreetingInterruptible="speech"` +
    // agentSpeaking on/off tells us when the goodbye has finished playing (see index.js).
    ` events="speaker-events" />` +
    `</Connect>` +
    `</Response>`
  );
}
