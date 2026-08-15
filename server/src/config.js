import 'dotenv/config';

// Central config, read once. Anything missing falls back to a safe default
// so the demo can run before every integration is wired up.
export const config = {
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  port: Number(process.env.PORT) || 8080,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-opus-5',

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
