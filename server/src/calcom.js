// Cal.com booking integration. If CALCOM_API_KEY / CALCOM_EVENT_TYPE_ID are not
// set, we run in MOCK mode so the demo works end-to-end immediately.
//
// NOTE: Cal.com's API shape shifts between versions. The live calls below target
// the v2 API; if your Cal.com account returns a different shape, adjust the two
// fetch() blocks — the mock path already gives you a working demo in the meantime.

import { config, isCalcomLive } from './config.js';

const CAL_BASE = 'https://api.cal.com/v2';

function humanizeSlot(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
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
          phoneNumber: phone || undefined,
          timeZone: 'America/New_York',
        },
        metadata: { service: service || '', source: 'Biggify AI receptionist' },
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
