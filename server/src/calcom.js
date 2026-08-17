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
function humanizeSlot(iso) {
  const d = new Date(iso);
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  let dayLabel;
  if (dayDiff === 0) dayLabel = 'today';
  else if (dayDiff === 1) dayLabel = 'tomorrow';
  else {
    const weekday = d.toLocaleString('en-US', { weekday: 'long' });
    const month = d.toLocaleString('en-US', { month: 'long' });
    dayLabel = `${weekday} ${month} ${ordinal(d.getDate())}`;
  }
  let h = d.getHours();
  const min = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = min === 0 ? `${h} ${ampm}` : `${h}:${String(min).padStart(2, '0')} ${ampm}`;
  return `${dayLabel} at ${time}`;
}

// Returns up to `count` upcoming slots as [{ startsAt, humanTime }].
export async function getAvailableSlots(count = 3, cal = null) {
  const creds = calCreds(cal);
  if (!calLive(cal)) return mockSlots(count);

  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const url = `${CAL_BASE}/slots?eventTypeId=${encodeURIComponent(creds.eventTypeId)}` +
    `&startTime=${start.toISOString()}&endTime=${end.toISOString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'cal-api-version': '2024-09-04',
      },
    });
    if (!res.ok) throw new Error(`Cal.com slots ${res.status}`);
    const json = await res.json();
    // v2 returns { data: { "YYYY-MM-DD": [{ start }] } }. Take the EARLIEST slot
    // from each day, in date order, so we offer the soonest time today + the
    // soonest on the next open day (not two times on the same day).
    const buckets = json?.data || {};
    const picked = [];
    for (const day of Object.keys(buckets).sort()) {
      const daySlots = buckets[day];
      if (!daySlots || !daySlots.length) continue;
      const iso = daySlots[0].start || daySlots[0].time || daySlots[0];
      picked.push(iso);
      if (picked.length >= count) break;
    }
    return picked.map((iso) => ({ startsAt: iso, humanTime: humanizeSlot(iso) }));
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
    return { ok: true, calBookingId: `mock-${Date.now()}`, humanTime: humanizeSlot(startsAt) };
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

// Fallback only (used if Cal.com is unreachable). Sane business-hour slots, one
// per weekday, starting today if a slot is still in the future — never odd hours.
function mockSlots(count) {
  const out = [];
  const soon = Date.now() + 30 * 60 * 1000;
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
