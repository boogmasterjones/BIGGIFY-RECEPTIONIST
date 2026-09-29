-- Seeds Biggify's own business row and maps its Twilio number to it.
-- Run this AFTER schema.sql, in the Supabase SQL Editor.

insert into public.businesses (id, name, trade, services, service_area, hours, owner_alert_email)
values (
  '00000000-0000-0000-0000-000000000001',
  'Biggify',
  'AI receptionist, marketing, and automation',
  array[
    'SEO','lead-gen','automation','AI-receptionist','business growth acceleration tools',
    'website design','Google Business Profile management','social media management',
    'social media marketing','Facebook marketing','Instagram marketing','Google Ads','Meta Ads'
  ],
  'home-service businesses across the U.S.',
  '7 days a week, 8am to 8pm ET',
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
