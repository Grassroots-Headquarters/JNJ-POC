-- sign_up_company creates the Company and the caller's Admin Membership in one step.
begin;
select plan(9);

\set cleo '10000000-0000-4000-8000-000000000005'
\set company_a '20000000-0000-4000-8000-00000000000a'

select has_function('public', 'sign_up_company', array['text', 'text', 'text'], 'sign_up_company(company_name, full_name, referral_code) exists');

-- Not logged in: refused.
set local role anon;
select throws_ok(
  $$ select public.sign_up_company('Nobody Ltd', 'Nobody') $$,
  '42501',
  'permission denied for function sign_up_company',
  'anon cannot call sign_up_company at all'
);

-- Cleo has no Membership yet and signs her own Company up with Company A's Referral code.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$ select public.sign_up_company('Cleo Co', 'Cleo Client', 'ZZZZZZ') $$,
  'P0001',
  'Unknown Referral code',
  'an unknown Referral code is rejected'
);
select throws_ok(
  $$ select public.sign_up_company('   ', 'Cleo Client') $$,
  'P0001',
  'Company name is required',
  'a blank Company name is rejected'
);

create temporary table new_company as
  select public.sign_up_company('Cleo Co', 'Cleo Client', ' a7q4kx ') as id;

select is(public.membership_role((select id from new_company)), 'admin'::public.role, 'the caller is the new Company''s Admin');
select is((select name from public.companies where id = (select id from new_company)), 'Cleo Co', 'the Company is created with its name');
select is(
  (select referred_by_company_id from public.companies where id = (select id from new_company)),
  :'company_a'::uuid,
  'the Referral code is recorded against the referring Company, however it was typed'
);
select matches(
  (select referral_code from public.companies where id = (select id from new_company)),
  '^[A-HJ-NP-Z2-9]{6}$',
  'the new Company gets its own Referral code'
);
select is((select full_name from public.profiles where user_id = :'cleo'), 'Cleo Client', 'the caller''s profile name is set');

reset role;
select * from finish();
rollback;
