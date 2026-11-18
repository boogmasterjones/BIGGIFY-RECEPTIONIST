// Call recordings (owner 2026-11-18: clients want to play their receptionist calls back any time).
//
// Florida (Fla. Stat. 934.03) and several other states need every party's consent to record a call, so a call is
// only ever recorded when the greeting the caller hears says so. Both are decided by the same check
// (recordingOn), so the greeting can never claim a recording that isn't made, or the reverse.
//
//   1. telnyxAnswer puts <Start><Recording> before <Connect>, so only the receptionist's part of the call is
//      recorded (a call the business picks up itself on ring-first is never recorded: nobody told the caller).
//   2. Telnyx posts /recording-status-telnyx when the call ends. The file link it sends only works for a short
//      time, so we download it at once into the private 'call-recordings' bucket ({business_id}/{call_id}.mp3)
//      and set calls.recording_path. The dashboard plays it from a short-lived signed link.
//   3. A daily sweep removes files whose call row is gone (the 30-day call cleanup deletes rows only).
//
// Off switches: RECORD_CALLS=off on the server (all businesses), or businesses.features.record_calls=false.

import crypto from 'node:crypto';
import { config } from './config.js';
import { serviceDb } from './supabase.js';

export const RECORDING_BUCKET = 'call-recordings';
const MAX_BYTES = 60 * 1024 * 1024; // ~2 hours of mp3; anything bigger is not a receptionist call

/** True when this call will be recorded (and so the greeting must say so). Only real businesses (with a row). */
export function recordingOn(business) {
  if (String(process.env.RECORD_CALLS || '').toLowerCase() === 'off') return false;
  return Boolean(business?.id) && business.recordCalls !== false;
}

const NOTICE = "this call's recorded so we get your details right";

/**
 * The greeting with the recording notice worked in, said naturally rather than as a separate announcement:
 *   "... so this is the answering service, and this call's recorded so we get your details right. When's ..."
 * A greeting that already mentions recording is left alone. Without an "answering service" sentence the notice
 * goes after the first sentence.
 */
export function withRecordingNotice(greeting) {
  const g = String(greeting || '').trim();
  if (!g || /\brecord/i.test(g)) return g;
  const m = /answering service([^.?!]*)([.!])/i.exec(g);
  if (m) {
    const at = m.index + m[0].length - 1; // the full stop that ends that sentence
    return `${g.slice(0, at)}, and ${NOTICE}${g.slice(at)}`;
  }
  const first = /^[^.?!]*[.?!]/.exec(g);
  if (!first) return `${g}. ${cap(NOTICE)}.`;
  return `${first[0]} ${cap(NOTICE)}.${g.slice(first[0].length)}`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The status callback carries a token so nobody else can make us fetch a file: HMAC of the call's to/from with a
// server secret (the service key never leaves the server).
function secret() {
  return process.env.RECORDING_CALLBACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-only';
}
export function callbackToken(to = '', from = '') {
  return crypto.createHmac('sha256', secret()).update(`rec|${to}|${from}`).digest('hex').slice(0, 32);
}
function tokenOk(token, to, from) {
  const want = Buffer.from(callbackToken(to, from));
  const got = Buffer.from(String(token || ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function xmlEscape(s = '') {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

/** The <Start><Recording> block for the answer markup. One mixed channel, so it plays normally in headphones. */
export function recordingStartMarkup(publicUrl, to = '', from = '') {
  const base = publicUrl || `http://localhost:${config.port}`;
  const qs = new URLSearchParams({ to, from, k: callbackToken(to, from) });
  const cb = `${base}/recording-status-telnyx?${qs}`;
  return (
    `<Start>` +
    `<Recording channels="single" track="both" format="mp3"` +
    ` recordingStatusCallback="${xmlEscape(cb)}" recordingStatusCallbackMethod="POST"` +
    ` recordingStatusCallbackEvent="completed absent" />` +
    `</Start>`
  );
}

// Telnyx's callback fields follow Twilio's names; a few spellings are accepted in case they differ.
function pick(b, ...names) {
  for (const n of names) if (b?.[n] !== undefined && b[n] !== '') return String(b[n]);
  return '';
}

async function download(url, recordingId) {
  const tryFetch = async (u, headers = {}) => {
    const r = await fetch(u, { headers, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const len = Number(r.headers.get('content-length') || 0);
    if (len > MAX_BYTES) throw new Error(`too big (${len} bytes)`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`too big (${buf.length} bytes)`);
    if (buf.length < 512) throw new Error(`too small (${buf.length} bytes)`);
    return buf;
  };
  if (/^https:\/\//i.test(url)) {
    try {
      return await tryFetch(url);
    } catch (e) {
      console.warn(`[recording] direct download failed (${e.message}), trying the Telnyx API`);
    }
  }
  // The link may have expired (or need a key): ask the Telnyx API for a fresh one.
  const key = process.env.TELNYX_API_KEY || '';
  if (!key || !recordingId) throw new Error('no usable recording link');
  const r = await fetch(`https://api.telnyx.com/v2/recordings/${encodeURIComponent(recordingId)}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Telnyx API HTTP ${r.status}`);
  const j = await r.json();
  const fresh = j?.data?.download_urls?.mp3 || j?.data?.download_urls?.wav;
  if (!fresh) throw new Error('Telnyx API gave no download link');
  return tryFetch(fresh);
}

/** Find the call row: by Telnyx's call id first, else the newest call between these numbers in the last 3 hours. */
async function findCall(db, { callSid, to, from }) {
  if (callSid) {
    const { data } = await db.from('calls').select('id, business_id, recording_path').eq('call_sid', callSid).maybeSingle();
    if (data) return data;
  }
  if (!to) return null;
  let q = db
    .from('calls')
    .select('id, business_id, recording_path')
    .eq('to_number', to)
    .gte('started_at', new Date(Date.now() - 3 * 3600_000).toISOString())
    .is('recording_path', null)
    .order('started_at', { ascending: false })
    .limit(1);
  if (from) q = q.eq('from_number', from);
  const { data } = await q;
  return data?.[0] || null;
}

/** POST /recording-status-telnyx. Always answers 200 quickly so Telnyx does not retry; the work happens after. */
export function registerRecordingRoutes(app) {
  app.post('/recording-status-telnyx', (req, res) => {
    const b = req.body || {};
    const to = String(req.query.to || '');
    const from = String(req.query.from || '');
    if (!tokenOk(req.query.k, to, from)) {
      console.warn('[recording] callback with a bad token, ignored');
      return res.status(403).end();
    }
    res.status(200).end();
    saveRecording(b, { to, from }).catch((e) => console.error('[recording] save failed:', e.message));
  });
}

export async function saveRecording(b, { to, from }) {
  const status = pick(b, 'RecordingStatus', 'recording_status', 'status').toLowerCase();
  const url = pick(b, 'RecordingUrl', 'recording_url', 'RecordingURL');
  const recordingId = pick(b, 'RecordingSid', 'recording_sid', 'RecordingId', 'recording_id');
  const callSid = pick(b, 'CallSid', 'call_sid', 'CallSessionId', 'call_session_id');
  const seconds = Number(pick(b, 'RecordingDuration', 'recording_duration', 'Duration')) || null;
  console.log(`[recording] status=${status || '(none)'} call=${callSid || '?'} rec=${recordingId || '?'} secs=${seconds ?? '?'} fields=${Object.keys(b).join(',')}`);
  if (status && status !== 'completed') return; // "absent" = Telnyx made no recording
  if (!url && !recordingId) return;
  const db = serviceDb();
  if (!db) return;
  const call = await findCall(db, { callSid, to, from });
  if (!call) {
    console.warn(`[recording] no call row for call=${callSid || '?'} to=${to}`);
    return;
  }
  if (call.recording_path) return; // already saved (a retried callback)
  const audio = await download(url, recordingId);
  const path = `${call.business_id}/${call.id}.mp3`;
  const up = await db.storage.from(RECORDING_BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  const { error } = await db.from('calls').update({ recording_path: path, recording_seconds: seconds }).eq('id', call.id);
  if (error) throw new Error(`update call: ${error.message}`);
  console.log(`[recording] saved ${path} (${Math.round(audio.length / 1024)} KB)`);
}

/** Remove recordings whose call row no longer exists (the daily call cleanup and the dashboard delete only drop rows). */
export async function sweepOrphanRecordings() {
  const db = serviceDb();
  if (!db) return 0;
  let removed = 0;
  const { data: folders } = await db.storage.from(RECORDING_BUCKET).list('', { limit: 1000 });
  for (const f of folders || []) {
    if (!f.name || f.id) continue; // folders only ({business_id}/)
    const { data: files } = await db.storage.from(RECORDING_BUCKET).list(f.name, { limit: 1000 });
    const ids = (files || []).map((x) => x.name.replace(/\.mp3$/, '')).filter((x) => /^[0-9a-f-]{36}$/.test(x));
    if (!ids.length) continue;
    const { data: live } = await db.from('calls').select('id').in('id', ids);
    const keep = new Set((live || []).map((r) => r.id));
    const gone = ids.filter((id) => !keep.has(id)).map((id) => `${f.name}/${id}.mp3`);
    if (gone.length) {
      await db.storage.from(RECORDING_BUCKET).remove(gone);
      removed += gone.length;
    }
  }
  if (removed) console.log(`[recording] sweep removed ${removed} orphaned recording(s)`);
  return removed;
}

export function startRecordingSweep() {
  const run = () => sweepOrphanRecordings().catch((e) => console.error('[recording] sweep:', e.message));
  setTimeout(run, 60_000).unref?.();
  setInterval(run, 24 * 3600_000).unref?.();
}
