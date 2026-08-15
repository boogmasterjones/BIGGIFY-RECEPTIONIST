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
