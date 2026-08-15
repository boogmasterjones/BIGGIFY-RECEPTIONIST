-- Seed one demo business (Bob's HVAC) and map your real Twilio number to it.
-- Run this AFTER schema.sql, in the Supabase SQL Editor.

insert into public.businesses (id, name, trade, services, service_area, hours, owner_alert_email)
values (
  '00000000-0000-0000-0000-000000000001',
  'Bob''s HVAC',
  'HVAC and heating/cooling',
  array['AC repair','heating repair','HVAC installation and replacement','maintenance and tune-ups'],
  'the greater Tampa area',
  'Monday to Friday, 8am to 6pm',
  'gobiggify@gmail.com'
)
on conflict (id) do nothing;

insert into public.phone_numbers (e164, business_id, label)
values ('+19417594411', '00000000-0000-0000-0000-000000000001', 'Main line')
on conflict (e164) do nothing;

-- After you sign up in the dashboard, promote yourself to super-admin and
-- attach yourself to the demo business as owner. Replace <YOUR_AUTH_UID>
-- (find it in Supabase -> Authentication -> Users) then run:
--
-- update public.profiles set is_super_admin = true where id = '<YOUR_AUTH_UID>';
-- insert into public.memberships (user_id, business_id, role)
-- values ('<YOUR_AUTH_UID>', '00000000-0000-0000-0000-000000000001', 'owner')
-- on conflict do nothing;
