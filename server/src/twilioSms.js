// SMS sending via Twilio. In non-live mode (no credentials, or before 10DLC is
// approved) it just logs — so the demo never crashes on a missing key.

import twilio from 'twilio';
import { config, isSmsLive } from './config.js';
import { sendEmail } from './email.js';

let client = null;
if (isSmsLive) {
  client = twilio(config.twilio.accountSid, config.twilio.authToken);
}

export async function sendSms(to, body, from = null) {
  if (!to) return { ok: false, reason: 'no recipient' };
  if (!isSmsLive) {
    console.log(`[sms:mock]${from ? ` (from ${from})` : ''} -> ${to}\n${body}\n`);
    return { ok: true, mocked: true };
  }
  try {
    const payload = { to, body };
    // Prefer sending from the business's own number when given, so replies land
    // on their line; otherwise fall back to the messaging service / env number.
    if (from) {
      payload.from = from;
    } else if (config.twilio.messagingServiceSid) {
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

// The caller is told their time is set as soon as we've validated the slot,
// without waiting on Cal.com — otherwise they sit through that round trip in
// silence. If the write then fails, nothing else in the system would notice, so
// make it unmissable for the owner.
export async function alertBookingFailed(lead, business = null, reason = '') {
  const ownerEmail = business?.ownerAlertEmail ?? config.business.ownerAlertEmail;
  const ownerPhone = business?.ownerAlertPhone ?? config.business.ownerAlertPhone;
  const bizName = business?.name || config.business.name;
  const body = [
    `A caller was told their callback is booked, but writing it to the calendar FAILED.`,
    `Please add it manually and confirm with them.`,
    ``,
    `Name:     ${lead?.name || 'Caller'}`,
    `Phone:    ${lead?.phone || 'n/a'}`,
    `Callback: ${lead?.appointment?.humanTime || 'unknown time'}`,
    `Reason:   ${reason || 'unknown'}`,
  ].join('\n');
  const subject = `ACTION NEEDED — calendar not updated for ${lead?.name || 'a caller'}`;
  console.error(`[booking] calendar write failed for lead ${lead?.id}: ${reason}`);
  const results = {};
  if (ownerEmail) results.email = await sendEmail(ownerEmail, subject, body, bizName);
  if (ownerPhone) results.sms = await sendSms(ownerPhone, body);
  return { ok: Boolean(ownerEmail || ownerPhone), ...results };
}

// Alerts the business owner that a new lead came in — by email (primary) and,
// if an owner phone is set, by SMS too. `business` carries the recipient info;
// falls back to env config for the single-business setup. Best-effort.
export async function alertOwner(lead, business = null) {
  const ownerEmail = business?.ownerAlertEmail ?? config.business.ownerAlertEmail;
  const ownerPhone = business?.ownerAlertPhone ?? config.business.ownerAlertPhone;
  const bizName = business?.name || config.business.name;
  const survey = lead.survey || {};
  const isMessage = lead.status === 'message' || Boolean(lead.message);

  let lines;
  let subject;
  if (isMessage) {
    lines = [
      `A caller left a message with your Biggify receptionist:`,
      ``,
      `Name:    ${lead.name || 'Caller'}`,
      `Phone:   ${lead.phone || 'n/a'}`,
      ``,
      `Message: ${lead.message || survey.notes || 'n/a'}`,
    ];
    subject = `New message — ${lead.name || 'Caller'}`;
  } else {
    lines = [
      `New lead from your Biggify receptionist:`,
      ``,
      `Name:     ${lead.name || 'Caller'}`,
      `Phone:    ${lead.phone || 'n/a'}`,
      `Work:     ${lead.service || survey.issue || 'n/a'}`,
      lead.appointment ? `Callback: ${lead.appointment.humanTime}` : `Callback: (not scheduled — callback requested)`,
      survey.notes ? `Notes:    ${survey.notes}` : '',
    ].filter(Boolean);
    subject = `New lead — ${lead.name || 'Caller'}${lead.service ? ` (${lead.service})` : ''}`;
  }
  const body = lines.join('\n');

  const results = {};
  if (ownerEmail) {
    results.email = await sendEmail(ownerEmail, subject, body, bizName);
  }
  if (ownerPhone) {
    results.sms = await sendSms(ownerPhone, body);
  }
  if (!results.email && !results.sms) return { ok: false, reason: 'no owner email or phone set' };
  return { ok: true, ...results };
}
