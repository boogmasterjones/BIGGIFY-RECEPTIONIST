'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: boolean; error?: string };

export async function deleteCall(id: string): Promise<Result> {
  const supabase = await createClient();
  // Remove the recording too (the voice server's daily sweep also catches any file left behind).
  const { data: row } = await supabase.from('calls').select('recording_path').eq('id', id).maybeSingle();
  if (row?.recording_path) await supabase.storage.from('call-recordings').remove([row.recording_path]);
  const { error } = await supabase.from('calls').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/calls');
  return { ok: true };
}
