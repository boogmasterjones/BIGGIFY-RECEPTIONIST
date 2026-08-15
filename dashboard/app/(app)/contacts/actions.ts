'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ContactInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string; // comma-separated in the form
};

export type Result = { ok: boolean; error?: string };

function parse(input: ContactInput) {
  return {
    name: input.name?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
    tags: (input.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export async function createContact(businessId: string, input: ContactInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('contacts')
    .insert({ business_id: businessId, source: 'manual', ...parse(input) });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contacts');
  return { ok: true };
}

export async function updateContact(id: string, input: ContactInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('contacts').update(parse(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contacts');
  return { ok: true };
}

export async function deleteContact(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contacts');
  return { ok: true };
}
