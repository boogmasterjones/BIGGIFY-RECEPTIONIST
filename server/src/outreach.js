// Automated customer outreach — runs on a timer in the always-on server.
//   • Quote Follow-Up Vault: 3/7/14-day texts to quotes that never booked.
//   • 5-Star Autopilot: a review-request text right after a job completes.
// Every send is recorded in job_followups so a message is never sent twice.
// Both features are opt-in per business and no-op unless DB + SMS are live.

import { serviceDb, isSupabaseLive } from './supabase.js';
import { sendSms } from './twilioSms.js';

// Each quote step fires inside a window (so a step is skipped, not blasted late,
// if the sweep was down — and pre-existing old quotes never get a stale blast).
const QUOTE_WINDOWS = [
  { step: 1, from: 3, to: 7 },   // ~3-day nudge
  { step: 2, from: 7, to: 14 },  // ~7-day nudge
  { step: 3, from: 14, to: 21 }, // ~14-day nudge
];
const REVIEW_MAX_AGE_DAYS = 7; // only ask on jobs completed within the last week

const firstName = (name) => (name ? String(name).trim().split(/\s+/)[0] : 'there');
const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;

async function notify(db, businessId, type, title, body) {
  try {
    await db.from('notifications').insert({ business_id: businessId, type, title, body: body || null });
  } catch (e) {
    console.error('[outreach] notify:', e.message);
  }
}

async function businessSendNumber(db, businessId) {
  try {
    const { data } = await db
      .from('phone_numbers')
      .select('e164')
      .eq('business_id', businessId)
      .limit(1)
      .maybeSingle();
    return data?.e164 || null;
  } catch {
    return null;
  }
}

async function alreadySent(db, jobId, kind) {
  const { data } = await db.from('job_followups').select('step').eq('job_id', jobId).eq('kind', kind);
  return new Set((data || []).map((r) => r.step));
}

async function record(db, biz, job, contact, kind, step, res) {
  await db.from('job_followups').insert({
    business_id: biz.id,
    job_id: job.id,
    contact_id: contact.id,
    kind,
    step,
    status: res.ok ? 'sent' : 'failed',
    detail: res.ok ? null : res.error || res.reason || 'send failed',
  });
}

async function runQuoteFollowups(db, biz, fromNumber) {
  let sent = 0;
  const { data: jobs } = await db
    .from('jobs')
    .select('id, contact_id, value_cents, quoted_at, completed_at, followups_paused, stage:job_stages(name), contact:contacts(id, name, phone)')
    .eq('business_id', biz.id)
    .not('quoted_at', 'is', null)
    .is('completed_at', null)
    .eq('followups_paused', false)
    .gt('value_cents', 0);

  for (const job of jobs || []) {
    const contact = job.contact;
    if (!contact?.phone) continue;
    if (/lost|cancel/i.test(job.stage?.name || '')) continue;

    // Booked? An appointment scheduled after the quote means they're on the calendar.
    const { count: booked } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job.id)
      .gt('starts_at', job.quoted_at);
    if (booked && booked > 0) continue;

    const age = daysSince(job.quoted_at);
    const sentSteps = await alreadySent(db, job.id, 'quote');
    const win = QUOTE_WINDOWS.find((w) => !sentSteps.has(w.step) && age >= w.from && age < w.to);
    if (!win) continue;

    const body =
      `Hi ${firstName(contact.name)}, it's ${biz.name} following up on the quote we sent — ` +
      `happy to answer any questions or get you on the schedule. Just reply here. (Reply STOP to opt out.)`;
    const res = await sendSms(contact.phone, body, fromNumber);
    await record(db, biz, job, contact, 'quote', win.step, res);
    if (res.ok) {
      sent++;
      await notify(db, biz.id, 'followup_sent', `Quote follow-up sent to ${contact.name || 'a customer'}`, `Day ${win.from} nudge — no reply needed from you.`);
    }
  }
  return sent;
}

async function runReviewRequests(db, biz, fromNumber) {
  let sent = 0;
  const cutoff = new Date(Date.now() - REVIEW_MAX_AGE_DAYS * 86400000).toISOString();
  const { data: jobs } = await db
    .from('jobs')
    .select('id, contact_id, completed_at, followups_paused, contact:contacts(id, name, phone)')
    .eq('business_id', biz.id)
    .eq('followups_paused', false)
    .not('completed_at', 'is', null)
    .gte('completed_at', cutoff);

  for (const job of jobs || []) {
    const contact = job.contact;
    if (!contact?.phone) continue;
    const sentSteps = await alreadySent(db, job.id, 'review');
    if (sentSteps.size > 0) continue;

    const link = biz.review_url ? ` ${biz.review_url}` : '';
    const body =
      `Hi ${firstName(contact.name)}, thanks for choosing ${biz.name}! If you were happy with the work, ` +
      `a quick review would mean a lot:${link || ' just reply here!'} (Reply STOP to opt out.)`;
    const res = await sendSms(contact.phone, body, fromNumber);
    await record(db, biz, job, contact, 'review', 1, res);
    if (res.ok) {
      sent++;
      await notify(db, biz.id, 'review_sent', `Review request sent to ${contact.name || 'a customer'}`, 'Sent right after the job wrapped — when satisfaction is highest.');
    }
  }
  return sent;
}

export async function runOutreachSweep() {
  if (!isSupabaseLive) return { skipped: 'db not live' };
  const db = serviceDb();
  let quote = 0;
  let review = 0;
  try {
    const { data: bizes } = await db
      .from('businesses')
      .select('id, name, review_url, quote_followups_enabled, review_requests_enabled')
      .or('quote_followups_enabled.eq.true,review_requests_enabled.eq.true');

    for (const biz of bizes || []) {
      const fromNumber = await businessSendNumber(db, biz.id);
      if (biz.quote_followups_enabled) quote += await runQuoteFollowups(db, biz, fromNumber);
      if (biz.review_requests_enabled) review += await runReviewRequests(db, biz, fromNumber);
    }
  } catch (e) {
    console.error('[outreach] sweep:', e.message);
  }
  if (quote || review) console.log(`[outreach] sent ${quote} quote follow-up(s), ${review} review request(s)`);
  return { quote, review };
}

// Start the periodic sweep. Runs shortly after boot, then hourly.
export function startOutreachScheduler() {
  if (!isSupabaseLive) return;
  const HOUR = 60 * 60 * 1000;
  setTimeout(() => runOutreachSweep().catch(() => {}), 60 * 1000); // 1 min after boot
  setInterval(() => runOutreachSweep().catch(() => {}), HOUR);
  console.log('[outreach] scheduler started (hourly sweep)');
}
