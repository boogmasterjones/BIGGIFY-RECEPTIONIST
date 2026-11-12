-- Migration 014: the cold-call practice line's drills (Hubert's "Sales drilling" tab, 2026-11-11).
-- Run in Supabase -> SQL Editor for the RECEPTIONIST project. Safe to re-run.
--
-- One row per practice drill. The phone server (service role) is the only reader and writer: Hubert never
-- touches this table, it asks the server through /practice-api/* with PRACTICE_API_SECRET. RLS is on with
-- no policies, so the anon and authenticated keys can see nothing (the scenario column holds the hidden
-- traits, which must not reach the tab before the call).
--
--   armed     ready for the next call to the practice line (at most one, see the unique index)
--   live      a call took it (or is being scored)
--   done      finished and scored
--   replaced  armed, then swapped for another before anyone called

create table if not exists public.practice_drills (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'armed' check (status in ('armed', 'live', 'done', 'replaced')),
  source            text not null default 'hubert' check (source in ('hubert', 'auto', 'call', 'rerun')),
  drill             text not null,                   -- drill id: full, objections, gatekeeper, opener, close, discovery, hotseat, voicemail
  difficulty        text not null check (difficulty in ('easy', 'normal', 'tough')),
  difficulty_target smallint not null default 1 check (difficulty_target between 0 and 2),
  sticky_drill      text,                            -- he picked this drill on the tab: the next ones keep to it
  scenario          jsonb not null,                  -- the whole prospect, hidden traits included
  voice             jsonb not null,                  -- { id, gender }
  rerun_of          uuid references public.practice_drills(id) on delete set null,
  caller_last4      text,
  armed_at          timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz,
  outcome           text,
  note              text,
  paused            boolean not null default false,
  score             smallint check (score between 0 and 10),
  scorecard         text,
  turns             jsonb,                           -- [{ who: 'rep' | 'prospect', text }]
  stats             jsonb,
  next_target       smallint check (next_target between 0 and 2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Only one armed drill at a time.
create unique index if not exists practice_drills_one_armed on public.practice_drills (status) where status = 'armed';
create index if not exists practice_drills_recent_idx on public.practice_drills (created_at desc);

alter table public.practice_drills enable row level security;
-- No policies on purpose: only the service role (the phone server) reads or writes.
