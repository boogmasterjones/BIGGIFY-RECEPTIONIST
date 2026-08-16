-- ============================================================
-- Biggify: run all pending migrations (002 -> 003 -> 004)
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Every statement is idempotent (safe to run more than once).
-- ============================================================

-- ============================================================================
-- Migration 002: the job workspace (tasks, materials, files)
-- Run in Supabase -> SQL Editor after 001. Safe to re-run.
--
-- Turns a job into a workspace: a checklist of tasks, a materials/sourcing
-- list (with AI-autofill from a product link), and file attachments.
-- ============================================================================

-- Optional project/job title (e.g. "Johnson living room refresh")
alter table public.jobs add column if not exists title text;

-- ---------------------------------------------------------------------------
-- job_tasks: per-job checklist
-- ---------------------------------------------------------------------------
create table if not exists public.job_tasks (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists job_tasks_job_idx on public.job_tasks(job_id);
alter table public.job_tasks enable row level security;
drop policy if exists "job_tasks member all" on public.job_tasks;
create policy "job_tasks member all" on public.job_tasks
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- ---------------------------------------------------------------------------
-- job_materials: sourcing list (name, vendor, price, link, image, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.job_materials (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text,
  vendor      text,
  url         text,
  image_url   text,
  price_cents int,
  sku         text,
  dimensions  text,
  quantity    int,
  lead_time   text,
  room        text,
  status      text not null default 'proposed', -- proposed | approved | ordered | delivered
  notes       text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists job_materials_job_idx on public.job_materials(job_id);
alter table public.job_materials enable row level security;
drop policy if exists "job_materials member all" on public.job_materials;
create policy "job_materials member all" on public.job_materials
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- ---------------------------------------------------------------------------
-- job_files: attachment metadata (files live in the 'job-files' storage bucket)
-- ---------------------------------------------------------------------------
create table if not exists public.job_files (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text,
  storage_path text not null,
  mime         text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);
create index if not exists job_files_job_idx on public.job_files(job_id);
alter table public.job_files enable row level security;
drop policy if exists "job_files member all" on public.job_files;
create policy "job_files member all" on public.job_files
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));


-- ============================================================================
-- Migration 003: rooms (the planning layer)
-- Run in Supabase -> SQL Editor after 002. Safe to re-run.
--
-- Rooms are a first-class layer inside a job. Interior-design work (and remodels)
-- is organized by room: each room has square footage, dimensions, a budget, and
-- its own materials. Budget vs. actual rolls up from rooms to the whole job.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- job_rooms: per-job rooms / planning units
-- ---------------------------------------------------------------------------
create table if not exists public.job_rooms (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  sqft         numeric,          -- square footage
  dimensions   text,             -- e.g. "12' x 15'"
  budget_cents int,              -- planned budget for the room
  notes        text,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists job_rooms_job_idx on public.job_rooms(job_id);
alter table public.job_rooms enable row level security;
drop policy if exists "job_rooms member all" on public.job_rooms;
create policy "job_rooms member all" on public.job_rooms
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- ---------------------------------------------------------------------------
-- Link materials to a room (keeps the legacy free-text `room` column as a
-- fallback label; new UI assigns room_id).
-- ---------------------------------------------------------------------------
alter table public.job_materials
  add column if not exists room_id uuid references public.job_rooms(id) on delete set null;
create index if not exists job_materials_room_idx on public.job_materials(room_id);


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
