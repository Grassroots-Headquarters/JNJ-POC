-- Company separation on companies, memberships and profiles (ADR 0007).
-- Seeded Users: Alex Admin (A), Sam Site (A), Bea Boss (B), Dee Dual (A + B), Cleo Client (none).
begin;
select plan(27);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set dee  '10000000-0000-4000-8000-000000000004'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'

select has_table('public', 'companies', 'companies table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'memberships', 'memberships table exists');
select has_enum('public', 'role', 'role enum exists');
select hasnt_column('public', 'profiles', 'billing_email', 'a User has no billing email: billing email belongs to the Company');
select ok((select relrowsecurity from pg_class where oid = 'public.companies'::regclass), 'RLS is on for companies');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS is on for profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), 'RLS is on for memberships');

-- Bea, Admin of Company B, sees nothing of Company A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select results_eq(
  $$ select name from public.companies order by name $$,
  $$ values ('Hart Builders'::text) $$,
  'Bea sees only her own Company'
);
select is(
  (select count(*) from public.memberships where company_id = :'company_a'),
  0::bigint,
  'Bea cannot read Company A memberships'
);
select is(
  (select count(*) from public.memberships where company_id = :'company_b'),
  2::bigint,
  'Bea reads Company B memberships (herself and Dee)'
);
select is(
  (select count(*) from public.profiles where user_id = :'alex'),
  0::bigint,
  'Bea cannot read the profile of a Company A Admin'
);
select throws_ok(
  $$ insert into public.memberships (user_id, company_id, role) values ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000a', 'admin') $$,
  '42501',
  'permission denied for table memberships',
  'Bea cannot add herself to Company A'
);
update public.companies set name = 'Hacked' where id = :'company_a';
select ok(not public.is_member(:'company_a'), 'is_member is false for Bea in Company A');
select is(public.membership_role(:'company_a'), null, 'membership_role is null for Bea in Company A');

-- Dee belongs to both Companies and sees both, with the right Role in each.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select results_eq(
  $$ select name from public.companies order by name $$,
  $$ values ('Hart Builders'::text), ('JNJ Building'::text) $$,
  'Dee sees both of her Companies'
);
select is(public.membership_role(:'company_a'), 'site_team'::public.role, 'Dee is Site team in Company A');
select is(public.membership_role(:'company_b'), 'subcontractor'::public.role, 'Dee is a Subcontractor in Company B');
select is(
  (select count(*) from public.profiles where user_id in (:'alex', :'bea')),
  2::bigint,
  'Dee can read profiles of people in either of her Companies'
);

-- Sam (Site team, Company A) sees his Company's people but not Company B's.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*) from public.profiles where user_id = :'bea'),
  0::bigint,
  'Sam cannot read a Company B profile'
);
select ok(not public.is_admin(:'company_a'), 'Sam is not an Admin of Company A');
update public.companies set name = 'Renamed by Sam' where id = :'company_a';

reset role;
select is(
  (select name from public.companies where id = :'company_a'),
  'JNJ Building',
  'Company A is unchanged by Bea and Sam (no update rights)'
);

-- Alex (Admin of A) can rename his Company.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
update public.companies set name = 'JNJ Building Ltd' where id = :'company_a';
reset role;
select is(
  (select name from public.companies where id = :'company_a'),
  'JNJ Building Ltd',
  'An Admin can rename their Company'
);

-- An Admin may change the name, not the Referral link, the Referral code or
-- the Stripe customer: those are the platform's. The billing email goes
-- through the billing-email Edge Function so it reaches Stripe too.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ update public.companies set referred_by_company_id = '20000000-0000-4000-8000-00000000000b' where id = '20000000-0000-4000-8000-00000000000a' $$,
  '42501',
  'permission denied for table companies',
  'an Admin cannot rewrite who referred their Company'
);
select throws_ok(
  $$ update public.companies set referral_code = 'ZZZZZZ' where id = '20000000-0000-4000-8000-00000000000a' $$,
  '42501',
  'permission denied for table companies',
  'an Admin cannot change their Referral code'
);
select throws_ok(
  $$ update public.companies set stripe_customer_id = 'cus_forged' where id = '20000000-0000-4000-8000-00000000000a' $$,
  '42501',
  'permission denied for table companies',
  'an Admin cannot point their Company at another Stripe customer'
);
select throws_ok(
  $$ update public.companies set billing_email = 'x@example.com' where id = '20000000-0000-4000-8000-00000000000a' $$,
  '42501',
  'permission denied for table companies',
  'the billing email is not written straight to the table'
);
reset role;

select * from finish();
rollback;
