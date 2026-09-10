-- Onboard new client: Clearvant Window Washing Co (owner: Asher Knox).
-- Website: clearvantwc.com (no dedicated column on businesses — noted here only).
-- Run this in the Supabase SQL Editor, AFTER schema.sql.

insert into public.businesses (name, trade, services, service_area, owner_alert_email, owner_alert_phone)
values (
  'Clearvant Window Washing Co',
  'Window washing',
  array['residential window washing','commercial window washing','screen and track cleaning','gutter cleaning'],
  'Charlotte and Sarasota counties',
  'clearvantwc@gmail.com',
  '+19377221101'
)
returning id;

-- After Asher signs up in the dashboard (with clearvantwc@gmail.com), find his
-- auth uid in Supabase -> Authentication -> Users, then attach him as owner
-- (replace <ASHER_AUTH_UID> and <BUSINESS_ID> with the id returned above):
--
-- insert into public.memberships (user_id, business_id, role)
-- values ('<ASHER_AUTH_UID>', '<BUSINESS_ID>', 'owner')
-- on conflict do nothing;

-- If/when they get a dedicated Twilio number to route calls to this business:
--
-- insert into public.phone_numbers (e164, business_id, label)
-- values ('+1XXXXXXXXXX', '<BUSINESS_ID>', 'Main line')
-- on conflict (e164) do nothing;
