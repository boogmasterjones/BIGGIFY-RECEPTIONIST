// SMS sending via Twilio. In non-live mode (no credentials, or before 10DLC is
// approved) it just logs — so the demo never crashes on a missing key.

import twilio from 'twilio';
import { config, isSmsLive } from './config.js';

let client = null;
if (isSmsLive) {
  client = twilio(config.twilio.accountSid, config.twilio.authToken);
}

export async function sendSms(to, body) {
  if (!to) return { ok: false, reason: 'no recipient' };
  if (!isSmsLive) {
    console.log(`[sms:mock] -> ${to}\n${body}\n`);
    return { ok: true, mocked: true };
  }
  try {
    const payload = { to, body };
    if (config.twilio.messagingServiceSid) {
      payload.messagingServiceSid = config.twilio.messagingServiceSid;
    } else {
      payload.from = config.twilio.phoneNumber;
    }
    const msg = await client.messages.create(payload);
    return { ok: true, sid: msg.sid };
  } catch (err) {
    console.error('[sms] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

// Sends the post-call survey link to the caller.
export async function sendSurvey(lead) {
  const link = `${config.publicUrl}/survey/${lead.id}`;
  const body =
    `Hi${lead.name ? ' ' + lead.name.split(' ')[0] : ''}, thanks for calling ${config.business.name}! ` +
    `Please take 2 minutes to answer a few quick questions so we can help you fast: ${link} ` +
    `Reply STOP to opt out.`;
  return sendSms(lead.phone, body);
}

// Alerts the business owner that a new lead came in.
export async function alertOwner(lead) {
  if (!config.business.ownerAlertPhone) return { ok: false, reason: 'no owner phone' };
  const body =
    `New Biggify lead for ${config.business.name}:\n` +
    `${lead.name || 'Caller'} (${lead.phone})\n` +
    `Service: ${lead.service || 'n/a'}\n` +
    (lead.appointment ? `Booked: ${lead.appointment.humanTime}\n` : '') +
    `Dashboard: ${config.publicUrl}/dashboard`;
  return sendSms(config.business.ownerAlertPhone, body);
}
