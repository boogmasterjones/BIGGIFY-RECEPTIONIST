'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type JobStatus = 'new' | 'scheduled' | 'in_progress' | 'done' | 'canceled' | 'lost';

export type JobInput = {
  contact_id?: string;
  service?: string;
  description?: string;
  status?: JobStatus;
  value?: string; // dollars from the form
};

export type Result = { ok: boolean; error?: string };

function parse(input: JobInput) {
  const dollars = parseFloat((input.value || '').replace(/[^0-9.]/g, ''));
  return {
    contact_id: input.contact_id && input.contact_id !== '' ? input.contact_id : null,
    service: input.service?.trim() || null,
    description: input.description?.trim() || null,
    status: (input.status || 'new') as JobStatus,
    value_cents: Number.isFinite(dollars) ? Math.round(dollars * 100) : null,
  };
}

export async function createJob(businessId: string, input: JobInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('jobs')
    .insert({ business_id: businessId, source: 'manual', ...parse(input) });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}

export async function updateJob(id: string, input: JobInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('jobs').update(parse(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}

export async function setJobStatus(id: string, status: JobStatus): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}

export async function deleteJob(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}
