'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
  const { error } = await supabase
    .from('appointments')
    .insert({ business_id: businessId, ...parse(input) });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/appointments');
  return { ok: true };
}

export async function updateAppointment(id: string, input: AppointmentInput): Promise<Result> {
  if (!input.starts_at) return { ok: false, error: 'Pick a date and time.' };
  const supabase = await createClient();
  const { error } = await supabase.from('appointments').update(parse(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
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

export async function deleteAppointment(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/appointments');
  return { ok: true };
}
