'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: boolean; error?: string };

function done(): Result {
  revalidatePath('/settings');
  revalidatePath('/jobs');
  return { ok: true };
}

export async function addStage(businessId: string, name: string, color: string): Promise<Result> {
  const supabase = await createClient();
  const { data: max } = await supabase
    .from('job_stages')
    .select('position')
    .eq('business_id', businessId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;
  const { error } = await supabase
    .from('job_stages')
    .insert({ business_id: businessId, name: name.trim() || 'New stage', color, position });
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function updateStage(id: string, name: string, color: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('job_stages')
    .update({ name: name.trim() || 'Stage', color })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function deleteStage(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_stages').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function moveStage(id: string, dir: 'up' | 'down'): Promise<Result> {
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from('job_stages')
    .select('id, business_id, position')
    .eq('id', id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'Stage not found' };

  let q = supabase.from('job_stages').select('id, position').eq('business_id', cur.business_id);
  q = dir === 'up'
    ? q.lt('position', cur.position).order('position', { ascending: false })
    : q.gt('position', cur.position).order('position', { ascending: true });
  const { data: neighbor } = await q.limit(1).maybeSingle();
  if (!neighbor) return { ok: true };

  await supabase.from('job_stages').update({ position: neighbor.position }).eq('id', cur.id);
  await supabase.from('job_stages').update({ position: cur.position }).eq('id', neighbor.id);
  return done();
}
