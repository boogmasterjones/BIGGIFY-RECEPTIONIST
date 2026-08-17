// Cal.com booking integration. If CALCOM_API_KEY / CALCOM_EVENT_TYPE_ID are not
// set, we run in MOCK mode so the demo works end-to-end immediately.
//
// NOTE: Cal.com's API shape shifts between versions. The live calls below target
// the v2 API; if your Cal.com account returns a different shape, adjust the two
// fetch() blocks — the mock path already gives you a working demo in the meantime.

import { config, isCalcomLive } from './config.js';

const CAL_BASE = 'https://api.cal.com/v2';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// TTS-friendly, comma-free time phrase: "Monday August 18th at 9 AM".
// Commas make the voice pause mid-phrase, so we avoid them entirely.
function humanizeSlot(iso) {
  const d = new Date(iso);
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  const day = ordinal(d.getDate());
  let h = d.getHours();
  const min = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = min === 0 ? `${h} ${ampm}` : `${h}:${String(min).padStart(2, '0')} ${ampm}`;
  return `${weekday} ${month} ${day} at ${time}`;
}

// Returns up to `count` upcoming slots as [{ startsAt, humanTime }].
export async function getAvailableSlots(count = 3) {
  if (!isCalcomLive) return mockSlots(count);

  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const url = `${CAL_BASE}/slots?eventTypeId=${encodeURIComponent(config.calcom.eventTypeId)}` +
    `&startTime=${start.toISOString()}&endTime=${end.toISOString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.calcom.apiKey}`,
        'cal-api-version': '2024-09-04',
      },
    });
    if (!res.ok) throw new Error(`Cal.com slots ${res.status}`);
    const json = await res.json();
    // v2 returns { data: { "YYYY-MM-DD": [{ start }] } }
    const buckets = json?.data || {};
    const flat = [];
    for (const day of Object.keys(buckets)) {
      for (const s of buckets[day]) flat.push(s.start || s.time || s);
    }
    return flat.slice(0, count).map((iso) => ({ startsAt: iso, humanTime: humanizeSlot(iso) }));
  } catch (err) {
    console.error('[calcom] slots failed, using mock:', err.message);
    return mockSlots(count);
  }
}

// A valid-format placeholder email from the caller's number (Cal.com requires
// an attendee email; the caller only gives us a phone).
function attendeeEmail(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits ? `caller-${digits}@leads.biggify.com` : 'caller@leads.biggify.com';
}

// Books a slot. Returns { ok, calBookingId, humanTime }.
export async function createBooking({ startsAt, name, phone, service }) {
  if (!isCalcomLive) {
    return { ok: true, calBookingId: `mock-${Date.now()}`, humanTime: humanizeSlot(startsAt) };
  }
  try {
    const res = await fetch(`${CAL_BASE}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.calcom.apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventTypeId: Number(config.calcom.eventTypeId),
        start: startsAt,
        attendee: {
          name: name || 'Caller',
          // Cal.com requires an attendee email. The caller only gives a phone,
          // so we synthesize a valid-format placeholder (confirmation to it just
          // bounces — harmless). The real notification goes to the owner below.
          email: attendeeEmail(phone),
          phoneNumber: phone || undefined,
          timeZone: 'America/New_York',
        },
        // Put the business owner on every booking as a guest so they get the
        // calendar invite + email notification for each meeting.
        guests: config.business.ownerAlertEmail ? [config.business.ownerAlertEmail] : undefined,
        metadata: { service: service || '', phone: phone || '', source: 'Biggify AI receptionist' },
      }),
    });
    if (!res.ok) throw new Error(`Cal.com booking ${res.status}`);
    const json = await res.json();
    return {
      ok: true,
      calBookingId: json?.data?.uid || json?.data?.id || 'unknown',
      humanTime: humanizeSlot(startsAt),
    };
  } catch (err) {
    console.error('[calcom] booking failed:', err.message);
    return { ok: false, error: err.message, humanTime: humanizeSlot(startsAt) };
  }
}

function mockSlots(count) {
  const out = [];
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  for (let i = 1; out.length < count; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // skip weekends
    out.push({ startsAt: d.toISOString(), humanTime: humanizeSlot(d.toISOString()) });
  }
  return out;
}
