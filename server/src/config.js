import 'dotenv/config';

// Central config, read once. Anything missing falls back to a safe default
// so the demo can run before every integration is wired up.
export const config = {
  // PUBLIC_URL wins; on Render, RENDER_EXTERNAL_URL is injected automatically.
  publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),
  port: Number(process.env.PORT) || 8080,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  // Fast model for real-time voice. claude-haiku-4-5 is even faster if you
  // want to trade a little polish for speed; claude-opus-5 is most capable but
  // noticeably slower on a live call.
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-5',

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  },

  calcom: {
    apiKey: process.env.CALCOM_API_KEY || '',
    eventTypeId: process.env.CALCOM_EVENT_TYPE_ID || '',
  },

  business: {
    name: process.env.BUSINESS_NAME || 'the business',
    trade: process.env.BUSINESS_TRADE || 'home services',
    hours: process.env.BUSINESS_HOURS || 'Monday to Friday, 8am to 6pm',
    serviceArea: process.env.BUSINESS_SERVICE_AREA || 'the local area',
    // What the business actually offers — used to qualify callers on the call.
    services: process.env.BUSINESS_SERVICES ||
      'AC repair, heating repair, HVAC system installation and replacement, and routine maintenance/tune-ups',
    ownerAlertPhone: process.env.OWNER_ALERT_PHONE || '',
    ownerAlertEmail: process.env.OWNER_ALERT_EMAIL || '',
  },

  voice: process.env.RECEPTIONIST_VOICE || 'en-US-Journey-O',
};

export const isCalcomLive = Boolean(config.calcom.apiKey && config.calcom.eventTypeId);
export const isSmsLive = Boolean(
  config.twilio.accountSid && config.twilio.authToken &&
  (config.twilio.messagingServiceSid || config.twilio.phoneNumber)
);
