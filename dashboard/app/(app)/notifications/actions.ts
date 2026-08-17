'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';

export type Result = { ok: boolean; error?: string };

export async function markRead(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllRead(): Promise<Result> {
  const { business } = await getUserAndBusiness();
  if (!business) return { ok: false, error: 'No business' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('business_id', business.id)
    .is('read_at', null);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/notifications');
  return { ok: true };
}

export async function deleteNotification(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/notifications');
  return { ok: true };
}
