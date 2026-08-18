'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SaveState = { ok: boolean; error?: string } | null;

// Bound with the businessId, then called by useActionState(prevState, formData).
export async function updateBusiness(
  businessId: string,
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const supabase = await createClient();

  const services = String(formData.get('services') || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const patch = {
    name: String(formData.get('name') || '').trim(),
    trade: String(formData.get('trade') || '').trim() || null,
    services,
    service_area: String(formData.get('service_area') || '').trim() || null,
    hours: String(formData.get('hours') || '').trim() || null,
    voice: String(formData.get('voice') || '').trim() || 'en-US-Journey-O',
    greeting: String(formData.get('greeting') || '').trim() || null,
    owner_alert_email: String(formData.get('owner_alert_email') || '').trim() || null,
    owner_alert_phone: String(formData.get('owner_alert_phone') || '').trim() || null,
  };

  const { error } = await supabase.from('businesses').update(patch).eq('id', businessId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/');
  return { ok: true };
}

// Automated outreach settings (Quote Follow-Up Vault + 5-Star Autopilot).
export async function updateAutomations(
  businessId: string,
  input: { quote_followups_enabled: boolean; review_requests_enabled: boolean; review_url: string }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('businesses')
    .update({
      quote_followups_enabled: input.quote_followups_enabled,
      review_requests_enabled: input.review_requests_enabled,
      review_url: input.review_url.trim() || null,
    })
    .eq('id', businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
}
