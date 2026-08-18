'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { runStageAutomations } from '@/lib/automation';

export type JobInput = {
  title?: string;
  contact_id?: string;
  service?: string;
  description?: string;
  stage_id?: string;
  value?: string; // dollars from the form
};

export type Result = { ok: boolean; error?: string };

function parse(input: JobInput) {
  const dollars = parseFloat((input.value || '').replace(/[^0-9.]/g, ''));
  return {
    title: input.title?.trim() || null,
    contact_id: input.contact_id ? input.contact_id : null,
    service: input.service?.trim() || null,
    description: input.description?.trim() || null,
    stage_id: input.stage_id ? input.stage_id : null,
    value_cents: Number.isFinite(dollars) ? Math.round(dollars * 100) : null,
  };
}

export async function createJob(businessId: string, input: JobInput): Promise<Result> {
  const supabase = await createClient();
  const row = parse(input);
  const insert: Record<string, unknown> = { business_id: businessId, source: 'manual', ...row };
  // Stamp the quote time when the job is created with a value — starts the
  // follow-up clock (Quote Follow-Up Vault).
  if (row.value_cents && row.value_cents > 0) insert.quoted_at = new Date().toISOString();
  const { error } = await supabase.from('jobs').insert(insert);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}

export async function updateJob(id: string, input: JobInput): Promise<Result> {
  const supabase = await createClient();
  const row = parse(input);
  const patch: Record<string, unknown> = { ...row };
  // First time a value is set, stamp quoted_at (don't reset it on later edits).
  if (row.value_cents && row.value_cents > 0) {
    const { data: existing } = await supabase.from('jobs').select('quoted_at').eq('id', id).maybeSingle();
    if (existing && !existing.quoted_at) patch.quoted_at = new Date().toISOString();
  }
  const { error } = await supabase.from('jobs').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/jobs');
  return { ok: true };
}

export async function setJobStage(id: string, stageId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('jobs').update({ stage_id: stageId }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await runStageAutomations(id, stageId);
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
