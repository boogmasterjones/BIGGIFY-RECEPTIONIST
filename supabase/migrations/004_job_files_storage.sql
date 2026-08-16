-- ============================================================================
-- Migration 004: storage bucket for job files/photos
-- Run in Supabase -> SQL Editor after 003. Safe to re-run.
--
-- The job_files TABLE already exists (migration 002). This creates the private
-- storage bucket the files actually live in, plus RLS so a user can only touch
-- files under a business they're a member of.
--
-- Path convention (enforced by the app):  {business_id}/{job_id}/{uuid}-{name}
-- so the first folder in the object path is the business_id.
-- ============================================================================

-- Private bucket (files are client plans/photos — never public).
insert into storage.buckets (id, name, public)
values ('job-files', 'job-files', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS on storage.objects, scoped to this bucket + the caller's memberships.
-- (storage.foldername(name))[1] is the first path segment = business_id.
-- ---------------------------------------------------------------------------
drop policy if exists "job-files member read"   on storage.objects;
drop policy if exists "job-files member insert" on storage.objects;
drop policy if exists "job-files member update" on storage.objects;
drop policy if exists "job-files member delete" on storage.objects;

create policy "job-files member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'job-files'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );

create policy "job-files member insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-files'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );

create policy "job-files member update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'job-files'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );

create policy "job-files member delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'job-files'
    and public.is_member((( storage.foldername(name) )[1])::uuid)
  );
