// Multi-tenant data layer. The voice server looks up which business a call is
// for by the dialed Twilio number, then drives the whole call from THAT
// business's config and writes the call/contact/appointment back to Supabase.
//
// Uses the service_role key (bypasses RLS) — this runs server-side only, never
// in the browser. If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set, every
// function no-ops and the server falls back to the single-business env config,
// so nothing breaks before Supabase is wired up.

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const isSupabaseLive = Boolean(url && serviceKey);

const supabase = isSupabaseLive
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

// The single-business config from env vars — used as a fallback when Supabase
// isn't configured, or when a dialed number isn't mapped to any business.
export function envBusiness() {
  return {
    id: null,
    name: config.business.name,
    trade: config.business.trade,
    services: config.business.services,
    serviceArea: config.business.serviceArea,
    hours: config.business.hours,
    timezone: 'America/New_York',
    greeting: process.env.BUSINESS_GREETING || null,
    voice: config.voice,
    ttsProvider: config.ttsProvider,
    ownerAlertEmail: config.business.ownerAlertEmail,
    ownerAlertPhone: config.business.ownerAlertPhone,
    cal: { apiKey: config.calcom.apiKey, eventTypeId: config.calcom.eventTypeId },
  };
}

// Map a businesses row to the config shape the rest of the server expects.
function toBusinessConfig(row) {
  const services = Array.isArray(row.services) ? row.services.join(', ') : row.services || '';
  return {
    id: row.id,
    name: row.name || 'the business',
    trade: row.trade || 'home services',
    services: services || 'general home services',
    serviceArea: row.service_area || 'the local area',
    hours: row.hours || 'Monday to Friday, 8am to 6pm',
    timezone: row.timezone || 'America/New_York',
    greeting: row.greeting || null,
    voice: row.voice || config.voice,
    ttsProvider: config.ttsProvider,
    ownerAlertEmail: row.owner_alert_email || '',
    ownerAlertPhone: row.owner_alert_phone || '',
    cal: { apiKey: row.cal_api_key || '', eventTypeId: row.cal_event_type_id || '' },
  };
}

// Look up the business for a dialed number (E.164). Returns a business config,
// or null if Supabase isn't live / the number isn't mapped.
export async function lookupBusinessByNumber(e164) {
  if (!supabase || !e164) return null;
  try {
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('business:businesses(*)')
      .eq('e164', e164)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.business;
    const row = Array.isArray(raw) ? raw[0] : raw;
    return row ? toBusinessConfig(row) : null;
  } catch (e) {
    console.error('[supabase] lookupBusinessByNumber:', e.message);
    return null;
  }
}

async function firstStageId(businessId) {
  if (!supabase || !businessId) return null;
  try {
    const { data } = await supabase
      .from('job_stages')
      .select('id')
      .eq('business_id', businessId)
      .order('position')
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function logCall({ businessId, callSid, from, to }) {
  if (!supabase || !businessId) return null;
  try {
    const { data, error } = await supabase
      .from('calls')
      .insert({ business_id: businessId, call_sid: callSid || null, from_number: from || null, to_number: to || null })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (e) {
    console.error('[supabase] logCall:', e.message);
    return null;
  }
}

export async function upsertContactByPhone({ businessId, phone, name }) {
  if (!supabase || !businessId) return null;
  try {
    let existing = null;
    if (phone) {
      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();
      existing = data;
    }
    if (existing) {
      if (name && !existing.name) await supabase.from('contacts').update({ name }).eq('id', existing.id);
      return existing.id;
    }
    const { data, error } = await supabase
      .from('contacts')
      .insert({ business_id: businessId, phone: phone || null, name: name || null, source: 'ai_call' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (e) {
    console.error('[supabase] upsertContactByPhone:', e.message);
    return null;
  }
}

export async function createAppointment({ businessId, contactId, startsAt, notes }) {
  if (!supabase || !businessId || !startsAt) return null;
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert({ business_id: businessId, contact_id: contactId || null, starts_at: startsAt, status: 'scheduled', notes: notes || null })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (e) {
    console.error('[supabase] createAppointment:', e.message);
    return null;
  }
}

export async function createJob({ businessId, contactId, service, description }) {
  if (!supabase || !businessId) return null;
  try {
    const stage_id = await firstStageId(businessId);
    const { data, error } = await supabase
      .from('jobs')
      .insert({ business_id: businessId, contact_id: contactId || null, service: service || null, description: description || null, source: 'ai_call', stage_id })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (e) {
    console.error('[supabase] createJob:', e.message);
    return null;
  }
}

export async function updateCall(id, patch) {
  if (!supabase || !id) return;
  try {
    await supabase.from('calls').update(patch).eq('id', id);
  } catch (e) {
    console.error('[supabase] updateCall:', e.message);
  }
}

export async function updateAppointment(id, patch) {
  if (!supabase || !id) return;
  try {
    await supabase.from('appointments').update(patch).eq('id', id);
  } catch (e) {
    console.error('[supabase] updateAppointment:', e.message);
  }
}
