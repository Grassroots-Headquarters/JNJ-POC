-- Local and CI seed data. Runs after migrations on `supabase db reset`.
insert into public.platform_status (id, message)
values (1, 'connected')
on conflict (id) do update set message = excluded.message;

-- Fixed test Users (contracts: Ofcom test numbers, OTP code 123456). GoTrue
-- stores phones without the leading +. The profiles rows come from the
-- on_auth_user_created trigger, which reads full_name from the metadata.
insert into auth.users (
  id, instance_id, aud, role, phone, phone_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  encrypted_password, confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
)
select
  id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', phone, now(),
  jsonb_build_object('full_name', full_name), '{"provider": "phone", "providers": ["phone"]}'::jsonb,
  '', '', '', '', '', '', '', '', '',
  now(), now()
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, '447700900001', 'Alex Admin'),
  ('10000000-0000-4000-8000-000000000002'::uuid, '447700900002', 'Sam Site'),
  ('10000000-0000-4000-8000-000000000003'::uuid, '447700900003', 'Bea Boss'),
  ('10000000-0000-4000-8000-000000000004'::uuid, '447700900004', 'Dee Dual'),
  ('10000000-0000-4000-8000-000000000005'::uuid, '447700900005', 'Cleo Client')
) as u (id, phone, full_name);

insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, 'phone', phone, jsonb_build_object('sub', id::text, 'phone', phone), now(), now(), now()
from auth.users
where phone like '4477009000%';

-- Companies A and B and the Memberships from the contracts.
insert into public.companies (id, name, referral_code) values
  ('20000000-0000-4000-8000-00000000000a', 'JNJ Building', 'A7Q4KX'),
  ('20000000-0000-4000-8000-00000000000b', 'Hart Builders', 'BH2M9T');

insert into public.memberships (user_id, company_id, role) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', 'admin'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', 'site_team'),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000b', 'admin'),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000a', 'site_team'),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000b', 'subcontractor');

-- One Job in each Company. Dee is the Job lead of Overbury Avenue (A) and a
-- Subcontractor on Hart Lane refit (B); Cleo is the Client of Overbury Avenue
-- and holds no Membership. Sam and Bea are on no Job.
insert into public.jobs (id, company_id, name, address, start_date) values
  ('30000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-00000000000a', 'Overbury Avenue', '12 Overbury Ave, Beckenham', '2026-09-14'),
  ('30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', 'Hart Lane refit', '5 Hart Lane, Croydon', '2026-10-05');

insert into public.assignments (job_id, user_id, company_id, is_job_lead) values
  ('30000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000a', true),
  ('30000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-00000000000a', false),
  ('30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000b', false);
