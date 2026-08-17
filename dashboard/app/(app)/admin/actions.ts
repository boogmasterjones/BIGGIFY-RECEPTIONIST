'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: boolean; error?: string; id?: string };

export type BusinessInput = {
  name?: string;
  trade?: string;
  services?: string; // comma-separated
  service_area?: string;
  hours?: string;
  timezone?: string;
  voice?: string;
  greeting?: string;
  owner_alert_email?: string;
  owner_alert_phone?: string;
  cal_api_key?: string;
  cal_event_type_id?: string;
  plan?: string;
  features?: Record<string, boolean>;
};

function parse(input: BusinessInput) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.trade !== undefined) row.trade = input.trade.trim() || null;
  if (input.services !== undefined) row.services = input.services.split(',').map((s) => s.trim()).filter(Boolean);
  if (input.service_area !== undefined) row.service_area = input.service_area.trim() || null;
  if (input.hours !== undefined) row.hours = input.hours.trim() || null;
  if (input.timezone !== undefined && input.timezone.trim()) row.timezone = input.timezone.trim();
  if (input.voice !== undefined && input.voice.trim()) row.voice = input.voice.trim();
  if (input.greeting !== undefined) row.greeting = input.greeting.trim() || null;
  if (input.owner_alert_email !== undefined) row.owner_alert_email = input.owner_alert_email.trim() || null;
  if (input.owner_alert_phone !== undefined) row.owner_alert_phone = input.owner_alert_phone.trim() || null;
  if (input.cal_api_key !== undefined) row.cal_api_key = input.cal_api_key.trim() || null;
  if (input.cal_event_type_id !== undefined) row.cal_event_type_id = input.cal_event_type_id.trim() || null;
  if (input.plan !== undefined && input.plan.trim()) row.plan = input.plan.trim();
  if (input.features !== undefined) row.features = input.features;
  return row;
}

export async function createBusiness(input: BusinessInput): Promise<Result> {
  if (!input.name?.trim()) return { ok: false, error: 'Business name is required' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('businesses').insert(parse(input)).select('id').single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true, id: data.id as string };
}

export async function updateBusinessAdmin(id: string, input: BusinessInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('businesses').update(parse(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function addPhoneNumber(businessId: string, e164: string, label: string): Promise<Result> {
  const num = e164.trim();
  if (!/^\+\d{8,15}$/.test(num)) return { ok: false, error: 'Enter an E.164 number like +19417594411' };
  const supabase = await createClient();
  const { error } = await supabase.from('phone_numbers').insert({ e164: num, business_id: businessId, label: label.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function deletePhoneNumber(e164: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('phone_numbers').delete().eq('e164', e164);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}
