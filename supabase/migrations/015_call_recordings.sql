-- ============================================================================
-- Migration 015: receptionist call recordings (owner 2026-11-18)
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- The voice server saves each recorded call to the private 'call-recordings' bucket at
--   {business_id}/{call_id}.mp3
-- and sets calls.recording_path. Members of the business can play (read) and delete their own recordings;
-- only the server (service role) writes them. A recording lives as long as its call: the server's daily sweep
-- removes files whose call row is gone (the 30-day call cleanup and the dashboard's delete drop rows only).
-- ============================================================================

alter table public.calls add column if not exists recording_path    text;
alter table public.calls add column if not exists recording_seconds integer;

insert into storage.buckets (id, name, public)
values ('call-recordings', 'call-recordings', false)
on conflict (id) do nothing;

drop policy if exists "call-recordings member read"   on storage.objects;
drop policy if exists "call-recordings member delete" on storage.objects;

create policy "call-recordings member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'call-recordings'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );

create policy "call-recordings member delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'call-recordings'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );
