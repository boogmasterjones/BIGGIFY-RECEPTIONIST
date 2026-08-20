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

// The calendar day (in the given timezone) a moment falls on, as "YYYY-Month-D" —
// used to compare two timestamps' local dates regardless of the server's own zone.
function isoDayKey(date, timeZone = 'America/New_York') {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(date);
  return `${p.find((x) => x.type === 'year')?.value}-${p.find((x) => x.type === 'month')?.value}-${p.find((x) => x.type === 'day')?.value}`;
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
  const zonedDayKey = `${get('year')}-${get('month')}-${get('day')}`;
  let dayLabel;
  if (zonedDayKey === isoDayKey(new Date(), timeZone)) dayLabel = 'today';
  else if (zonedDayKey === isoDayKey(new Date(Date.now() + 86400000), timeZone)) dayLabel = 'tomorrow';
  else dayLabel = `${get('weekday')} ${get('month')} ${ordinal(Number(get('day')))}`;
  const hour = get('hour');
  const minute = get('minute');
  const ampm = get('dayPeriod') || (Number(hour) >= 12 ? 'PM' : 'AM');
  const time = minute === '00' ? `${hour} ${ampm}` : `${hour}:${minute} ${ampm}`;
  return `${dayLabel} at ${time}`;
}

// Returns up to `count` upcoming slots as [{ startsAt, humanTime }]. If
// `preferredIso` is given (the caller named a specific day/time), picks the
// closest actual opening to it on that same day instead of just the day's
// earliest slot — so "tomorrow at 4pm" finds the nearest real 4pm-ish slot
// rather than defaulting to whatever opens first.
export async function getAvailableSlots(count = 3, cal = null, timeZone = 'America/New_York', preferredIso = null) {
  const creds = calCreds(cal);
  if (!calLive(cal)) return mockSlots(count);

  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const url = `${CAL_BASE}/slots?eventTypeId=${encodeURIComponent(creds.eventTypeId)}` +
    `&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}` +
    `&timeZone=${encodeURIComponent(timeZone)}`;

  const preferredDate = preferredIso ? new Date(preferredIso) : null;
  const preferredDayKey = preferredDate && !isNaN(preferredDate) ? isoDayKey(preferredDate, timeZone) : null;

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
    // v2 returns { data: { "YYYY-MM-DD": [{ start }] } }.
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
      const futureSlots = daySlots
        .map((s) => s.start || s.time || s)
        .filter((iso) => new Date(iso).getTime() > cutoff);
      if (!futureSlots.length) continue;

      let iso;
      if (preferredDayKey && isoDayKey(new Date(futureSlots[0]), timeZone) === preferredDayKey) {
        // This is the day the caller asked about — pick the slot closest to
        // the time they named, not just the earliest one.
        const target = preferredDate.getTime();
        iso = futureSlots.reduce((closest, cur) =>
          Math.abs(new Date(cur).getTime() - target) < Math.abs(new Date(closest).getTime() - target) ? cur : closest
        );
      } else {
        iso = futureSlots[0]; // earliest that day
      }
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

// Cancels a real Cal.com booking. Returns { ok }. No-op (ok: true) for mock
// bookings or when Cal.com isn't live for this business.
export async function cancelBooking(calBookingId, cal = null, reason = '') {
  if (!calBookingId || calBookingId.startsWith('mock-')) return { ok: true };
  const creds = calCreds(cal);
  if (!calLive(cal)) return { ok: true };
  try {
    const res = await fetch(`${CAL_BASE}/bookings/${encodeURIComponent(calBookingId)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason: reason || 'Caller canceled' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Cal.com cancel ${res.status}: ${body}`);
    }
    return { ok: true };
  } catch (err) {
    console.error('[calcom] cancel failed:', err.message);
    return { ok: false, error: err.message };
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
