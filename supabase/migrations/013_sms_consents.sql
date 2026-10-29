-- SMS opt-in records for the 10DLC campaign (Telnyx asked for a live, public opt-in form whose submit actually
-- records consent). The public form at gobiggify.com/sms-opt-in writes here with the anon key, so the table allows
-- anonymous INSERT only: nobody can read or change rows without a signed-in membership (service role for reporting).
create table if not exists public.sms_consents (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,                       -- as typed, digits kept; E.164 when we can make one
  phone_e164   text,
  name         text,
  business     text,                                -- which client the person dealt with, if they said
  brand        text not null default 'BIGGIFY LLC', -- the registered brand the consent names
  consent      boolean not null default false,      -- the checkbox; false means they submitted without opting in
  consent_text text not null,                       -- the exact disclosure shown next to the checkbox at the time
  source       text not null default 'gobiggify.com/sms-opt-in',
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz                          -- set when a STOP arrives for this number
);
create index if not exists sms_consents_phone_idx on public.sms_consents(phone_e164);
create index if not exists sms_consents_created_idx on public.sms_consents(created_at desc);

alter table public.sms_consents enable row level security;
drop policy if exists "sms_consents anon insert" on public.sms_consents;
create policy "sms_consents anon insert" on public.sms_consents
  for insert to anon, authenticated with check (true);
-- No select/update/delete policies on purpose: the service role (dashboard reporting, STOP handling) bypasses RLS.
