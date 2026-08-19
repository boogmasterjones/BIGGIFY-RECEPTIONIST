// Calendar sync — dashboard can create/update/delete appointments in Cal.com
// Each business has its own Cal.com API key (per-business config in Supabase)

import { createClient } from '@supabase/supabase-js';

const CAL_BASE = 'https://api.cal.com/v2';

function supabase() {
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
}

// Fetch the business's Cal.com credentials from Supabase
async function getCalCreds(businessId) {
  const db = supabase();
  if (!db || !businessId) return null;
  try {
    const { data } = await db
      .from('businesses')
      .select('cal_api_key, cal_event_type_id')
      .eq('id', businessId)
      .maybeSingle();
    return data ? { apiKey: data.cal_api_key, eventTypeId: data.cal_event_type_id } : null;
  } catch (e) {
    console.error('[calendar-sync] getCalCreds:', e.message);
    return null;
  }
}

function attendeeEmail(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits ? `caller-${digits}@leads.biggify.com` : 'caller@leads.biggify.com';
}

// Create an appointment in Cal.com and store the booking ID in Supabase
export async function syncCreateAppointment(apptId, { businessId, startsAt, name, phone, notes }) {
  const creds = await getCalCreds(businessId);
  if (!creds?.apiKey || !creds?.eventTypeId) return null;

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
          email: attendeeEmail(phone),
          phoneNumber: phone || undefined,
        },
        metadata: { source: 'Biggify dashboard', notes },
      }),
    });
    if (!res.ok) throw new Error(`Cal.com ${res.status}`);
    const json = await res.json();
    const calBookingId = json?.data?.uid || json?.data?.id;

    // Store the Cal.com booking ID in the appointment
    const db = supabase();
    if (db && apptId && calBookingId) {
      await db.from('appointments').update({ cal_booking_id: calBookingId }).eq('id', apptId);
    }
    return calBookingId;
  } catch (err) {
    console.error('[calendar-sync] syncCreateAppointment:', err.message);
    return null;
  }
}

// Update an appointment in Cal.com (Cal.com doesn't have a direct update, so we delete + recreate)
export async function syncUpdateAppointment(apptId, calBookingId, { businessId, startsAt, name, phone, notes }) {
  const creds = await getCalCreds(businessId);
  if (!creds?.apiKey || !creds?.eventTypeId) return null;

  try {
    // Delete the old booking if it exists
    if (calBookingId) {
      await fetch(`${CAL_BASE}/bookings/${calBookingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'cal-api-version': '2024-08-13',
        },
      });
    }

    // Create a new booking
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
          email: attendeeEmail(phone),
          phoneNumber: phone || undefined,
        },
        metadata: { source: 'Biggify dashboard', notes },
      }),
    });
    if (!res.ok) throw new Error(`Cal.com ${res.status}`);
    const json = await res.json();
    const newCalBookingId = json?.data?.uid || json?.data?.id;

    // Store the new Cal.com booking ID
    const db = supabase();
    if (db && apptId && newCalBookingId) {
      await db.from('appointments').update({ cal_booking_id: newCalBookingId }).eq('id', apptId);
    }
    return newCalBookingId;
  } catch (err) {
    console.error('[calendar-sync] syncUpdateAppointment:', err.message);
    return null;
  }
}

// Delete an appointment in Cal.com
export async function syncDeleteAppointment(businessId, calBookingId) {
  const creds = await getCalCreds(businessId);
  if (!creds?.apiKey || !calBookingId) return true;

  try {
    const res = await fetch(`${CAL_BASE}/bookings/${calBookingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'cal-api-version': '2024-08-13',
      },
    });
    return res.ok;
  } catch (err) {
    console.error('[calendar-sync] syncDeleteAppointment:', err.message);
    return false;
  }
}
