-- Automated customer outreach:
--   • Quote Follow-Up Vault — 3/7/14-day texts to quotes that never booked.
--   • 5-Star Autopilot — a review-request text right after a job completes.
-- Both are OFF by default (opt-in per business) so we never text customers
-- without the owner turning it on.

alter table public.jobs add column if not exists quoted_at        timestamptz;
alter table public.jobs add column if not exists followups_paused boolean not null default false;

alter table public.businesses add column if not exists review_url               text;
alter table public.businesses add column if not exists quote_followups_enabled  boolean not null default false;
alter table public.businesses add column if not exists review_requests_enabled  boolean not null default false;

-- One row per outreach message we've sent, so the sweep never double-sends.
create table if not exists public.job_followups (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id      uuid references public.jobs(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  kind        text not null,                 -- 'quote' | 'review'
  step        int  not null default 1,       -- quote: 1=3d, 2=7d, 3=14d; review: 1
  channel     text not null default 'sms',
  status      text not null default 'sent',  -- 'sent' | 'failed'
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists job_followups_job_idx      on public.job_followups(job_id);
create index if not exists job_followups_business_idx on public.job_followups(business_id);

alter table public.job_followups enable row level security;
drop policy if exists "job_followups member all" on public.job_followups;
create policy "job_followups member all" on public.job_followups
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
