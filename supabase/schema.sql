-- ============================================================================
-- Biggify platform schema (Supabase / Postgres)
-- Multi-tenant: every row is scoped to a business. Row-Level Security (RLS)
-- guarantees each client only ever sees their own data. Per-business feature
-- flags gate which modules a client can access.
--
-- Apply in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- The voice server uses the SERVICE ROLE key, which bypasses RLS, so it can
-- write leads/appointments for any business.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (mirrors auth.users; one row per person who can log in)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  avatar_url    text,
  is_super_admin boolean not null default false,   -- Biggify staff (you)
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- businesses  (tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  trade         text,                                -- "HVAC and heating/cooling"
  services      text[] not null default '{}',        -- editable list of offered services
  service_area  text,                                -- editable service area description
  hours         text,
  timezone      text not null default 'America/New_York',
  voice         text not null default 'en-US-Journey-O',
  greeting      text,                                -- optional custom AI greeting
  logo_url      text,                                -- co-branding
  primary_color text default '#CF0000',
  owner_alert_email text,
  owner_alert_phone text,
  -- Per-client entitlements: which modules this business is paying for.
  plan          text not null default 'full',
  features      jsonb not null default
    '{"receptionist":true,"contacts":true,"jobs":true,"appointments":true,"calendar":true,"calendar_sync":true,"notifications":true,"invoicing":false,"statistics":false}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- phone_numbers  (route inbound calls to the right business)
-- ---------------------------------------------------------------------------
create table if not exists public.phone_numbers (
  e164        text primary key,                      -- +19417594411
  business_id uuid not null references public.businesses(id) on delete cascade,
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists phone_numbers_business_idx on public.phone_numbers(business_id);

-- ---------------------------------------------------------------------------
-- memberships  (users <-> businesses, with roles)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.role as enum ('owner','admin','staff');
exception when duplicate_object then null; end $$;

create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role        public.role not null default 'staff',
  created_at  timestamptz not null default now(),
  unique (user_id, business_id)
);
create index if not exists memberships_business_idx on public.memberships(business_id);
create index if not exists memberships_user_idx on public.memberships(user_id);

-- ---------------------------------------------------------------------------
-- contacts  (customers)
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text,
  phone       text,
  email       text,
  address     text,
  notes       text,
  tags        text[] not null default '{}',
  source      text not null default 'manual',        -- 'manual' | 'ai_call'
  created_at  timestamptz not null default now()
);
create index if not exists contacts_business_idx on public.contacts(business_id);

-- ---------------------------------------------------------------------------
-- jobs  (leads / work items)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.job_status as enum ('new','scheduled','in_progress','done','canceled','lost');
exception when duplicate_object then null; end $$;

create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  service     text,
  description text,
  status      public.job_status not null default 'new',
  source      text not null default 'manual',        -- 'manual' | 'ai_call'
  value_cents integer,                                -- for later invoicing
  created_at  timestamptz not null default now()
);
create index if not exists jobs_business_idx on public.jobs(business_id);
create index if not exists jobs_status_idx on public.jobs(status);

-- ---------------------------------------------------------------------------
-- appointments  (+ google_event_id for two-way Google Calendar sync)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.appt_status as enum ('scheduled','confirmed','completed','canceled');
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  contact_id      uuid references public.contacts(id) on delete set null,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  status          public.appt_status not null default 'scheduled',
  notes           text,
  google_event_id text,
  created_at      timestamptz not null default now()
);
create index if not exists appointments_business_idx on public.appointments(business_id);
create index if not exists appointments_start_idx on public.appointments(starts_at);

-- ---------------------------------------------------------------------------
-- calls  (AI receptionist call log + transcript)
-- ---------------------------------------------------------------------------
create table if not exists public.calls (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  job_id      uuid references public.jobs(id) on delete set null,
  call_sid    text,
  from_number text,
  to_number   text,
  transcript  jsonb,
  outcome     text,                                   -- booked | callback | out_of_scope | canceled
  started_at  timestamptz default now(),
  ended_at    timestamptz
);
create index if not exists calls_business_idx on public.calls(business_id);

-- ---------------------------------------------------------------------------
-- notifications  (in-app feed; email/SMS are sent by the server too)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,  -- null = whole business
  type        text not null,                          -- 'new_lead' | 'appointment_booked' | ...
  title       text not null,
  body        text,
  data        jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_business_idx on public.notifications(business_id);
create index if not exists notifications_user_idx on public.notifications(user_id);

-- ---------------------------------------------------------------------------
-- notification_preferences  (per user per business; channels they turn on)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  in_app      boolean not null default true,
  email       boolean not null default true,
  sms         boolean not null default false,
  events      jsonb not null default '{}',            -- optional per-event overrides
  primary key (user_id, business_id)
);

-- ---------------------------------------------------------------------------
-- google_credentials  (per business, for calendar sync)
-- ---------------------------------------------------------------------------
create table if not exists public.google_credentials (
  business_id   uuid primary key references public.businesses(id) on delete cascade,
  access_token  text,
  refresh_token text,
  calendar_id   text default 'primary',
  expiry        timestamptz,
  connected_by  uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles                enable row level security;
alter table public.businesses              enable row level security;
alter table public.phone_numbers           enable row level security;
alter table public.memberships             enable row level security;
alter table public.contacts                enable row level security;
alter table public.jobs                    enable row level security;
alter table public.appointments            enable row level security;
alter table public.calls                   enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.google_credentials      enable row level security;

-- Helpers (security definer so they can read membership rows without recursing
-- through RLS).
create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_super_admin);
$$;

create or replace function public.is_member(b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from public.memberships m where m.business_id = b and m.user_id = auth.uid());
$$;

create or replace function public.is_owner_admin(b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from public.memberships m
                 where m.business_id = b and m.user_id = auth.uid() and m.role in ('owner','admin'));
$$;

-- profiles: you see yourself; super admins see everyone.
create policy "profiles self or admin" on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- businesses: members read; owners/admins update; super admin creates/deletes (onboarding).
create policy "business members read" on public.businesses
  for select using (public.is_member(id));
create policy "business owneradmin update" on public.businesses
  for update using (public.is_owner_admin(id)) with check (public.is_owner_admin(id));
create policy "business admin insert" on public.businesses
  for insert with check (public.is_super_admin());
create policy "business admin delete" on public.businesses
  for delete using (public.is_super_admin());

-- memberships: members read their business's roster; owners/admins manage it.
create policy "membership read" on public.memberships
  for select using (public.is_member(business_id));
create policy "membership manage" on public.memberships
  for all using (public.is_owner_admin(business_id)) with check (public.is_owner_admin(business_id));

-- phone_numbers: members read; super admin manages (number provisioning).
create policy "phone read" on public.phone_numbers
  for select using (public.is_member(business_id));
create policy "phone admin manage" on public.phone_numbers
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- tenant data tables: any member of the business can manage rows.
create policy "contacts member all" on public.contacts
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "jobs member all" on public.jobs
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "appointments member all" on public.appointments
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "calls member all" on public.calls
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "notifications member all" on public.notifications
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "google member read" on public.google_credentials
  for select using (public.is_member(business_id));
create policy "google owneradmin manage" on public.google_credentials
  for all using (public.is_owner_admin(business_id)) with check (public.is_owner_admin(business_id));

-- notification_preferences: you manage your own.
create policy "notif prefs own" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
