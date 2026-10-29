'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

import { CONSENT_TEXT } from './consent';

export type OptInResult = { ok: true; consented: boolean } | { ok: false; error: string };

const toE164 = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
};

export async function submitOptIn(form: FormData): Promise<OptInResult> {
  const phone = String(form.get('phone') ?? '').trim();
  const name = String(form.get('name') ?? '').trim().slice(0, 120);
  const business = String(form.get('business') ?? '').trim().slice(0, 120);
  const consent = form.get('consent') === 'on';
  // A hidden field people do not see; bots fill it.
  if (String(form.get('company-website') ?? '').trim()) return { ok: true, consented: consent };
  const e164 = toE164(phone);
  if (!e164) return { ok: false, error: 'Please enter a 10-digit US phone number.' };

  const h = await headers();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, error: 'The form is not connected yet. Email gobiggify@gmail.com and we will add you by hand.' };
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('sms_consents').insert({
    phone,
    phone_e164: e164,
    name: name || null,
    business: business || null,
    consent,
    consent_text: CONSENT_TEXT,
    source: 'gobiggify.com/sms-opt-in',
    ip: (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
    user_agent: (h.get('user-agent') ?? '').slice(0, 300) || null,
  });
  if (error) return { ok: false, error: 'Something went wrong saving your request. Email gobiggify@gmail.com and we will add you by hand.' };
  return { ok: true, consented: consent };
}
