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
