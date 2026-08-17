-- ============================================================================
-- Migration 005: per-business Cal.com credentials
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- Lets each business (tenant) book to its OWN Cal.com / Google Calendar. The
-- voice server looks these up by the dialed phone number at call time.
-- ============================================================================

alter table public.businesses add column if not exists cal_api_key       text;
alter table public.businesses add column if not exists cal_event_type_id text;
