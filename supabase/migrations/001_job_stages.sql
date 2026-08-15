-- ============================================================================
-- Migration 001: per-business customizable job stages
-- Run this in Supabase -> SQL Editor (after schema.sql). Safe to re-run.
--
-- Moves job status from a fixed enum to a per-business "job_stages" table so
-- each client can define their own pipeline (add / rename / recolor / reorder).
-- ============================================================================

-- 1. Per-business stages
create table if not exists public.job_stages (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists job_stages_business_idx on public.job_stages(business_id);

alter table public.job_stages enable row level security;
drop policy if exists "job_stages member all" on public.job_stages;
create policy "job_stages member all" on public.job_stages
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- 2. Jobs reference a stage
alter table public.jobs add column if not exists stage_id uuid references public.job_stages(id) on delete set null;

-- 3. Seed a sensible default pipeline for a business (only if it has none)
create or replace function public.seed_default_job_stages(b uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.job_stages where business_id = b) then
    insert into public.job_stages (business_id, name, color, position) values
      (b, 'New',         '#4a3fd6', 0),
      (b, 'Scheduled',   '#9a6b00', 1),
      (b, 'In progress', '#0369a1', 2),
      (b, 'Done',        '#067a63', 3),
      (b, 'Canceled',    '#6b7280', 4),
      (b, 'Lost',        '#b02020', 5);
  end if;
end; $$;

-- 4. Seed defaults for every existing business
do $$ declare r record; begin
  for r in select id from public.businesses loop
    perform public.seed_default_job_stages(r.id);
  end loop;
end $$;

-- 5. Migrate any existing jobs from the old enum to a stage (best-effort by name)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='jobs' and column_name='status') then
    update public.jobs j set stage_id = s.id
    from public.job_stages s
    where s.business_id = j.business_id
      and lower(s.name) = lower(replace(j.status::text, '_', ' '))
      and j.stage_id is null;
  end if;
end $$;

-- Any job still without a stage gets the first stage.
update public.jobs j set stage_id = (
  select id from public.job_stages s where s.business_id = j.business_id order by position limit 1
) where j.stage_id is null;

-- 6. Auto-seed stages whenever a new business is created
create or replace function public.on_business_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_default_job_stages(new.id);
  return new;
end; $$;

drop trigger if exists business_created_seed_stages on public.businesses;
create trigger business_created_seed_stages
  after insert on public.businesses
  for each row execute function public.on_business_created();

-- 7. Retire the old fixed status column + enum
alter table public.jobs drop column if exists status;
drop type if exists public.job_status;
