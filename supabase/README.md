# Biggify — Supabase (database + auth)

This is the shared brain of the platform: it holds every client's data and logins. Clients never see Supabase — it's backend infrastructure.

## What's here
- `schema.sql` — all tables, multi-tenant security (Row-Level Security), and feature-gating. Safe to re-run.
- `seed.sql` — creates the demo business (Bob's HVAC) and maps your Twilio number to it.

## Data model (at a glance)
- **businesses** — one row per client (tenant). Holds their config (services, service area, hours, voice, branding) and a `features` flag map that controls which modules they can access.
- **profiles / memberships** — who can log in, and which businesses they belong to (roles: owner / admin / staff). `is_super_admin` = you (Biggify).
- **phone_numbers** — maps each Twilio number to a business, so the voice server knows whose call it is.
- **contacts** — customers.
- **jobs** — leads / work items (status pipeline; `value_cents` for future invoicing).
- **appointments** — scheduled work (+ `google_event_id` for Google Calendar sync).
- **calls** — AI receptionist call log + transcript.
- **notifications** + **notification_preferences** — in-app feed and per-user channel choices.
- **google_credentials** — per-business Google Calendar tokens.

## Multi-tenancy & isolation
Row-Level Security means a logged-in user can only ever read/write rows for businesses they're a member of — enforced by the database itself, not just the app. The voice server uses the **service role key** (which bypasses RLS) to write leads for any business.

## Feature entitlements
`businesses.features` is a JSON map like:
```json
{"receptionist":true,"contacts":true,"jobs":true,"appointments":true,
 "calendar":true,"calendar_sync":true,"notifications":true,
 "invoicing":false,"statistics":false}
```
The dashboard renders only the modules set to `true`, so each client sees a product tailored to their plan.

## Apply it
1. Create a project at supabase.com (free).
2. Project → **SQL Editor** → paste `schema.sql` → **Run**.
3. Paste `seed.sql` → **Run**.
4. From **Project Settings → API**, copy the **Project URL**, the **anon** key (public, goes in the dashboard), and the **service_role** key (secret, goes in the voice server env).
