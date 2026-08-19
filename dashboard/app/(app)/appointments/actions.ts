'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Get appointment details (contact name, phone, etc.) for Cal.com sync
async function getAppointmentDetails(supabase: any, input: AppointmentInput, businessId: string) {
  let contact = null;
  if (input.contact_id) {
    const { data } = await supabase
      .from('contacts')
      .select('name, phone')
      .eq('id', input.contact_id)
      .maybeSingle();
    contact = data;
  }
  return {
    name: contact?.name || 'Calendar event',
    phone: contact?.phone || '',
    notes: input.notes || '',
  };
}

// Sync appointment to Cal.com via the voice server
async function syncToCalCom(businessId: string, apptId: string, startsAt: string | null, details: any) {
  const serverUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL || 'https://biggify-receptionist.onrender.com';
  if (!startsAt) return; // nothing to sync without a time
  try {
    await fetch(`${serverUrl}/api/calendar/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, apptId, startsAt, ...details }),
    });
  } catch (e) {
    console.error('[appointments] Cal.com sync failed:', e);
    // Best-effort — don't fail the appointment creation if sync fails
  }
}

export type Result = { ok: boolean; error?: string };

export type AppointmentInput = {
  contact_id?: string;
  job_id?: string;
  starts_at?: string; // ISO
  ends_at?: string; // ISO or ''
  status?: string;
  notes?: string;
};

function parse(input: AppointmentInput) {
  return {
    contact_id: input.contact_id ? input.contact_id : null,
    job_id: input.job_id ? input.job_id : null,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    status: input.status?.trim() || 'scheduled',
    notes: input.notes?.trim() || null,
  };
}

export async function createAppointment(businessId: string, input: AppointmentInput): Promise<Result> {
  if (!input.starts_at) return { ok: false, error: 'Pick a date and time.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .insert({ business_id: businessId, ...parse(input) })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  // Sync to Cal.com (best-effort, non-blocking)
  if (data?.id) {
    const details = await getAppointmentDetails(supabase, input, businessId);
    syncToCalCom(businessId, data.id, input.starts_at, details);
  }
  revalidatePath('/appointments');
  return { ok: true };
}

export async function updateAppointment(id: string, input: AppointmentInput, businessId: string): Promise<Result> {
  if (!input.starts_at) return { ok: false, error: 'Pick a date and time.' };
  const supabase = await createClient();
  // Get the current appointment to find the Cal.com booking ID
  const { data: current } = await supabase
    .from('appointments')
    .select('cal_booking_id')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('appointments').update(parse(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  // Sync updates to Cal.com (best-effort)
  if (input.starts_at) {
    const details = await getAppointmentDetails(supabase, input, businessId);
    const serverUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL || 'https://biggify-receptionist.onrender.com';
    try {
      await fetch(`${serverUrl}/api/calendar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, calBookingId: current?.cal_booking_id || null, startsAt: input.starts_at, ...details }),
      });
    } catch (e) {
      console.error('[appointments] Cal.com sync failed:', e);
    }
  }
  revalidatePath('/appointments');
  return { ok: true };
}

export async function setAppointmentStatus(id: string, status: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/appointments');
  return { ok: true };
}

export async function deleteAppointment(id: string, businessId: string): Promise<Result> {
  const supabase = await createClient();
  // Get the Cal.com booking ID before deleting
  const { data: appt } = await supabase
    .from('appointments')
    .select('cal_booking_id')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  // Delete from Cal.com (best-effort)
  if (appt?.cal_booking_id) {
    const serverUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL || 'https://biggify-receptionist.onrender.com';
    try {
      await fetch(`${serverUrl}/api/calendar/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, calBookingId: appt.cal_booking_id }),
      });
    } catch (e) {
      console.error('[appointments] Cal.com deletion failed:', e);
    }
  }
  revalidatePath('/appointments');
  return { ok: true };
}
