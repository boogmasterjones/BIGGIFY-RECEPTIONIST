'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: boolean; error?: string };

export async function deleteCall(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('calls').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/calls');
  return { ok: true };
}
