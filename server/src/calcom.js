// Cal.com booking integration. If CALCOM_API_KEY / CALCOM_EVENT_TYPE_ID are not
// set, we run in MOCK mode so the demo works end-to-end immediately.
//
// NOTE: Cal.com's API shape shifts between versions. The live calls below target
// the v2 API; if your Cal.com account returns a different shape, adjust the two
// fetch() blocks — the mock path already gives you a working demo in the meantime.

import { config } from './config.js';

const CAL_BASE = 'https://api.cal.com/v2';

// Per-business Cal.com creds: { apiKey, eventTypeId }. Falls back to env config
// for the single-business setup.
function calCreds(cal) {
  return cal && (cal.apiKey || cal.eventTypeId) ? cal : { apiKey: config.calcom.apiKey, eventTypeId: config.calcom.eventTypeId };
}
function calLive(cal) {
  const c = calCreds(cal);
  return Boolean(c.apiKey && c.eventTypeId);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// TTS-friendly, comma-free time phrase — says "today"/"tomorrow" when it applies,
// else "Monday August 18th". Commas make the voice pause, so we avoid them.
// Always reads the wall-clock time in the BUSINESS's timezone (not the server's),
// so "9 AM" is only ever spoken when it's actually 9 AM there.
function humanizeSlot(iso, timeZone = 'America/New_York') {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const dayKeyFor = (date) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(date);
    return `${p.find((x) => x.type === 'year')?.value}-${p.find((x) => x.type === 'month')?.value}-${p.find((x) => x.type === 'day')?.value}`;
  };
  const zonedDayKey = `${get('year')}-${get('month')}-${get('day')}`;
  let dayLabel;
  if (zonedDayKey === dayKeyFor(new Date())) dayLabel = 'today';
  else if (zonedDayKey === dayKeyFor(new Date(Date.now() + 86400000))) dayLabel = 'tomorrow';
  else dayLabel = `${get('weekday')} ${get('month')} ${ordinal(Number(get('day')))}`;
  const hour = get('hour');
  const minute = get('minute');
  const ampm = get('dayPeriod') || (Number(hour) >= 12 ? 'PM' : 'AM');
  const time = minute === '00' ? `${hour} ${ampm}` : `${hour}:${minute} ${ampm}`;
  return `${dayLabel} at ${time}`;
}

// Returns up to `count` upcoming slots as [{ startsAt, humanTime }].
export async function getAvailableSlots(count = 3, cal = null, timeZone = 'America/New_York') {
  const creds = calCreds(cal);
  if (!calLive(cal)) return mockSlots(count);

  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const url = `${CAL_BASE}/slots?eventTypeId=${encodeURIComponent(creds.eventTypeId)}` +
    `&startTime=${start.toISOString()}&endTime=${end.toISOString()}` +
    `&timeZone=${encodeURIComponent(timeZone)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'cal-api-version': '2024-09-04',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Cal.com slots ${res.status}: ${body}`);
    }
    const json = await res.json();
    // v2 returns { data: { "YYYY-MM-DD": [{ start }] } }. Take the EARLIEST slot
    // from each day, in date order, so we offer the soonest time today + the
    // soonest on the next open day (not two times on the same day).
    const buckets = json?.data || {};
    // Never offer a slot the team can't realistically make — require at least
    // an hour of lead time.
    const cutoff = Date.now() + 60 * 60 * 1000;
    const picked = [];
    for (const day of Object.keys(buckets).sort()) {
      const daySlots = buckets[day];
      if (!daySlots || !daySlots.length) continue;
      // Defensive: never trust a slot blindly — skip anything not actually
      // in the future, regardless of what Cal.com's day bucket claims.
      const future = daySlots.find((s) => {
        const iso = s.start || s.time || s;
        return new Date(iso).getTime() > cutoff;
      });
      if (!future) continue;
      const iso = future.start || future.time || future;
      picked.push(iso);
      if (picked.length >= count) break;
    }
    return picked.map((iso) => ({ startsAt: iso, humanTime: humanizeSlot(iso, timeZone) }));
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
export async function createBooking({ startsAt, name, phone, service, cal = null, ownerEmail = '', timeZone = 'America/New_York' }) {
  const creds = calCreds(cal);
  if (!calLive(cal)) {
    return { ok: true, calBookingId: `mock-${Date.now()}`, humanTime: humanizeSlot(startsAt, timeZone) };
  }
  try {
    const res = await fetch(`${CAL_BASE}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventTypeId: Number(creds.eventTypeId),
        start: startsAt,
        attendee: {
          name: name || 'Caller',
          // Cal.com requires an attendee email. The caller only gives a phone,
          // so we synthesize a valid-format placeholder (confirmation to it just
          // bounces — harmless). The real notification goes to the owner below.
          email: attendeeEmail(phone),
          phoneNumber: phone || undefined,
          timeZone,
        },
        // Put the business owner on every booking as a guest so they get the
        // calendar invite + email notification for each meeting.
        guests: ownerEmail ? [ownerEmail] : undefined,
        metadata: { service: service || '', phone: phone || '', source: 'Biggify AI receptionist' },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Cal.com booking ${res.status}: ${body}`);
    }
    const json = await res.json();
    return {
      ok: true,
      calBookingId: json?.data?.uid || json?.data?.id || 'unknown',
      humanTime: humanizeSlot(startsAt, timeZone),
    };
  } catch (err) {
    console.error('[calcom] booking failed:', err.message);
    return { ok: false, error: err.message, humanTime: humanizeSlot(startsAt, timeZone) };
  }
}

// Fallback only (used if Cal.com is unreachable). Sane business-hour slots, one
// per weekday, starting today if a slot is still in the future — never odd hours.
function mockSlots(count) {
  const out = [];
  const soon = Date.now() + 60 * 60 * 1000;
  for (let i = 0; out.length < count && i < 12; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // weekends
    d.setHours(9, 0, 0, 0);
    if (d.getTime() < soon) {
      d.setHours(14, 0, 0, 0); // 9am passed — try 2pm today
      if (d.getTime() < soon) continue; // 2pm passed too — skip today
    }
    out.push({ startsAt: d.toISOString(), humanTime: humanizeSlot(d.toISOString()) });
  }
  return out;
}
