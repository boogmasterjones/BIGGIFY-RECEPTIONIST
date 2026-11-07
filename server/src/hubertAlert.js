// Tells Hubert (the agency platform) that the receptionist took a callback or a message, so Hubert can text the
// client's people from the Biggify line (owner 2026-11-07). Hubert owns the texting (10DLC, opt-outs, logging);
// this only reports what happened. Best-effort: a failure here never affects the call or the email alert.
//
// Env: HUBERT_ALERT_URL (e.g. https://biggify-dashboard.netlify.app/api/webhooks/receptionist-alert) and
// RECEPTIONIST_ALERT_SECRET (the same value as Hubert's RECEPTIONIST_ALERT_SECRET). Either missing = do nothing.

const TIMEOUT_MS = 5000;

export function hubertAlertPayload(lead, business, isMessage) {
  const survey = lead?.survey || {};
  return {
    to: lead?.calledNumber || null,
    businessName: business?.name || null,
    callerName: lead?.name || null,
    callerPhone: lead?.phone || null,
    kind: isMessage ? 'message' : 'callback',
    work: lead?.service || survey.issue || null,
    callbackTime: lead?.callbackTime || lead?.appointment?.humanTime || null,
    message: isMessage ? lead?.message || survey.notes || null : null,
    callId: lead?.callSid || lead?.id || null,
  };
}

export async function notifyHubert(lead, business, isMessage, env = process.env, fetchImpl = fetch) {
  const url = env.HUBERT_ALERT_URL || '';
  const secret = env.RECEPTIONIST_ALERT_SECRET || '';
  if (!url || !secret) return { sent: false, reason: 'not configured' };
  const payload = hubertAlertPayload(lead, business, isMessage);
  if (!payload.to) return { sent: false, reason: 'no business line on the lead' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-receptionist-secret': secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) console.error(`[hubert-alert] Hubert answered ${res.status}`);
    return { sent: res.ok, status: res.status };
  } catch (e) {
    console.error('[hubert-alert]', e?.message || e);
    return { sent: false, reason: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
