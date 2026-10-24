-- Jobs: Admins see and run every Job in their Company; everyone else sees only
-- the Jobs they are assigned to; nobody reaches another Company's Jobs (ADR 0007).
-- Seeded: Overbury Avenue (Company A) with Dee as Job lead and Cleo as its
-- Client; Hart Lane refit (Company B) with Dee as a Subcontractor.
begin;
select plan(27);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set dee  '10000000-0000-4000-8000-000000000004'
\set cleo '10000000-0000-4000-8000-000000000005'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'
\set job_a '30000000-0000-4000-8000-0000000000a1'
\set job_b '30000000-0000-4000-8000-0000000000b1'

select has_table('public', 'jobs', 'jobs table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.jobs'::regclass), 'RLS is on for jobs');
select has_function('public', 'is_assigned', array['uuid'], 'is_assigned(job) exists');

-- Alex, Admin of A, sees every Job of A and none of B.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select id from public.jobs $$,
  $$ values ('30000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'an Admin sees their Company''s Jobs and no other Company''s'
);
select ok(not public.is_assigned(:'job_a'), 'Alex is not assigned to Overbury Avenue (Admins see it anyway)');

-- Alex logs a Job; it records who logged it.
insert into public.jobs (company_id, name, address, start_date)
values (:'company_a', 'Birch Close kitchen', '3 Birch Close, Bromley', '2026-11-02')
returning id as new_job_id, created_by as new_created_by \gset
select is(:'new_created_by'::uuid, :'alex'::uuid, 'a new Job records the Admin who logged it');
update public.jobs set name = 'Birch Close kitchen and utility' where id = :'new_job_id';
select is(
  (select name from public.jobs where id = :'new_job_id'),
  'Birch Close kitchen and utility',
  'an Admin can rename their Company''s Job'
);
select throws_ok(
  $$ insert into public.jobs (company_id, name) values ('20000000-0000-4000-8000-00000000000a', '   ') $$,
  '23514',
  null,
  'a Job needs a name'
);
select throws_ok(
  $$ update public.jobs set company_id = '20000000-0000-4000-8000-00000000000b' where id = '30000000-0000-4000-8000-0000000000a1' $$,
  '42501',
  null,
  'a Job cannot be moved to another Company'
);

-- Sam, Site team in A, is on no Job: he sees none, and cannot log or change one.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*) from public.jobs), 0::bigint, 'a Site team member on no Job sees no Jobs');
select ok(not public.is_assigned(:'job_a'), 'is_assigned is false for a Job Sam is not on');
select throws_ok(
  $$ insert into public.jobs (company_id, name) values ('20000000-0000-4000-8000-00000000000a', 'Sam''s job') $$,
  '42501',
  null,
  'a Site team member cannot log a Job'
);

-- Dee is assigned in both Companies and sees exactly those two Jobs.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select results_eq(
  $$ select id from public.jobs order by id $$,
  $$ values ('30000000-0000-4000-8000-0000000000a1'::uuid), ('30000000-0000-4000-8000-0000000000b1'::uuid) $$,
  'a User in two Companies sees the Job she is assigned to in each'
);
select ok(public.is_assigned(:'job_a'), 'is_assigned is true for Dee on Overbury Avenue');
update public.jobs set name = 'Renamed by Dee' where id = :'job_a';
reset role;
select is((select name from public.jobs where id = :'job_a'), 'Overbury Avenue', 'an assigned Site team member cannot change the Job');
set local role authenticated;

-- Cleo, the Client of Overbury Avenue, reaches only that Job and holds no Membership.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select results_eq(
  $$ select id from public.jobs $$,
  $$ values ('30000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'a Client sees only the Job she is assigned to'
);
select is((select count(*) from public.companies), 0::bigint, 'a Client sees no Company rows');

-- Bea, Admin of B, can neither see nor change Company A's Jobs.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select results_eq(
  $$ select id from public.jobs $$,
  $$ values ('30000000-0000-4000-8000-0000000000b1'::uuid) $$,
  'an Admin of Company B sees only Company B''s Jobs'
);
select is((select count(*) from public.jobs where company_id = :'company_a'), 0::bigint, 'Bea sees none of Company A''s Jobs');
select ok(not public.is_assigned(:'job_a'), 'is_assigned is false for Bea on a Company A Job');
update public.jobs set name = 'Renamed by Bea' where id = :'job_a';
delete from public.jobs where id = :'job_a';
select throws_ok(
  $$ insert into public.jobs (company_id, name) values ('20000000-0000-4000-8000-00000000000a', 'Planted by Bea') $$,
  '42501',
  null,
  'an Admin of Company B cannot log a Job in Company A'
);
reset role;
select is((select name from public.jobs where id = :'job_a'), 'Overbury Avenue', 'Bea''s update did not touch the Company A Job');
select is((select count(*) from public.jobs where id = :'job_a'), 1::bigint, 'Bea''s delete did not remove the Company A Job');
select is((select count(*) from public.jobs where company_id = :'company_a' and name = 'Planted by Bea'), 0::bigint, 'no Job was planted in Company A');

-- Anonymous visitors see nothing.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select count(*) from public.jobs $$, '42501', null, 'anon cannot read jobs at all');

-- A removed Membership cuts off the Job on the next query.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.remove_member(:'company_a', :'dee');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select results_eq(
  $$ select id from public.jobs $$,
  $$ values ('30000000-0000-4000-8000-0000000000b1'::uuid) $$,
  'once removed from Company A, Dee no longer sees its Job'
);
select ok(not public.is_assigned(:'job_a'), 'is_assigned is false straight after the Membership is removed');

reset role;
select * from finish();
rollback;
