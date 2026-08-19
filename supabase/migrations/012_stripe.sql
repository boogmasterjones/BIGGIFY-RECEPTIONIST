-- 012: Stripe integration — per-business API keys + payment tracking
-- Each business can connect their own Stripe account for collecting payments

alter table public.businesses
add column stripe_secret_key text,
add column stripe_publishable_key text;

-- Track payment links and status
alter table public.invoices
add column stripe_payment_link_id text,
add column amount_paid_cents integer not null default 0;

create index if not exists invoices_stripe_link_idx on public.invoices(stripe_payment_link_id);
