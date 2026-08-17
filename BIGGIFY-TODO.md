# Biggify — things only *you* can do

Manual setup steps that need your accounts, keys, or a decision. Claude can't do these (secrets / external accounts / your call). Check them off as you go.

## Make call-booked appointments show in the dashboard
The live server is in `DB: MOCK` mode, so nothing the receptionist does is written to Supabase yet. To fix:

- [ ] **Render → add env vars → redeploy.** Set `SUPABASE_URL` (same project the dashboard uses) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → `service_role`, secret). Health check at https://biggify-receptionist.onrender.com/ should then read `DB: live (multi-tenant)`.
- [ ] **Map your Twilio number to the business.** In the Supabase SQL editor:
  ```sql
  insert into phone_numbers (e164, business_id, label)
  values ('+19417594411',
          (select id from businesses where name = 'Bob''s HVAC'),
          'Twilio main');
  ```
- [ ] **Put your Cal.com creds on the business row** (multi-tenant mode reads them from the row, not env):
  ```sql
  update businesses
  set cal_api_key = 'YOUR_CALCOM_API_KEY',
      cal_event_type_id = 'YOUR_EVENT_TYPE_ID'
  where name = 'Bob''s HVAC';
  ```

## Turn on the Money lens
- [ ] Run migrations `supabase/migrations/006_money.sql` and `007_job_messages.sql` in the Supabase SQL editor.
- [ ] Flip `features.invoicing = true` on your `businesses` row so the **Money** nav appears.

## Review + ship
- [ ] Review the local commits and tell Claude to **push** when you're ready (hard rule: never pushed without your say-so).

## Bigger, when you're ready (need external accounts)
- [ ] **Deploy the dashboard to Vercel** (needs a Vercel account).
- [ ] **Stripe** — collect payments + a shareable public invoice view (needs Stripe keys).
- [ ] **Slack** two-way mirror of the job Conversation thread (needs a Slack app).
- [ ] **Team / payroll** — member invites (needs the Supabase admin API + a decision on how invites should work).
