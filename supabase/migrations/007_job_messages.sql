-- ============================================================================
-- Migration 007: Comms — a conversation thread on each job
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- Conversations live ON the job so context is never lost. In-app now; a Slack
-- mirror can post/read the same thread later.
-- ============================================================================

create table if not exists public.job_messages (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text,
  source      text not null default 'app',            -- 'app' | 'slack' (later)
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists job_messages_job_idx on public.job_messages(job_id);
alter table public.job_messages enable row level security;
drop policy if exists "job_messages member all" on public.job_messages;
create policy "job_messages member all" on public.job_messages
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
