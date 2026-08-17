-- ============================================================================
-- Migration 006: the Money lens (invoices, line items, expenses)
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- Money always ties back to a job. Invoices can be auto-drafted from a job's
-- materials; expenses can be logged against a job so profit-per-job is real.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id      uuid references public.jobs(id) on delete set null,
  contact_id  uuid references public.contacts(id) on delete set null,
  number      text,                                   -- e.g. "INV-0007"
  status      text not null default 'draft',          -- draft | sent | paid | void
  issued_at   date,
  due_at      date,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists invoices_business_idx on public.invoices(business_id);
create index if not exists invoices_job_idx on public.invoices(job_id);
alter table public.invoices enable row level security;
drop policy if exists "invoices member all" on public.invoices;
create policy "invoices member all" on public.invoices
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  business_id     uuid not null references public.businesses(id) on delete cascade,
  description     text,
  quantity        numeric not null default 1,
  unit_price_cents int not null default 0,
  position        int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);
alter table public.invoice_items enable row level security;
drop policy if exists "invoice_items member all" on public.invoice_items;
create policy "invoice_items member all" on public.invoice_items
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  job_id       uuid references public.jobs(id) on delete set null,
  description  text,
  amount_cents int not null default 0,
  category     text,
  spent_at     date not null default current_date,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_business_idx on public.expenses(business_id);
create index if not exists expenses_job_idx on public.expenses(job_id);
alter table public.expenses enable row level security;
drop policy if exists "expenses member all" on public.expenses;
create policy "expenses member all" on public.expenses
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
