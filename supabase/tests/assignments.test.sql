-- Assignments: Admins put Members on Jobs and mark one Site team member as Job
-- lead; a User from another Company can neither see nor change them (ADR 0007).
-- Seeded: Overbury Avenue (A) with Dee as Job lead and Cleo as Client; Hart
-- Lane refit (B) with Dee as a Subcontractor.
begin;
select plan(33);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set dee  '10000000-0000-4000-8000-000000000004'
\set cleo '10000000-0000-4000-8000-000000000005'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'
\set job_a '30000000-0000-4000-8000-0000000000a1'
\set job_b '30000000-0000-4000-8000-0000000000b1'

select has_table('public', 'assignments', 'assignments table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.assignments'::regclass), 'RLS is on for assignments');
select has_function('public', 'assign_to_job', array['uuid', 'uuid', 'boolean'], 'assign_to_job(job, user_id, job_lead) exists');
select has_function('public', 'unassign_from_job', array['uuid', 'uuid'], 'unassign_from_job(job, user_id) exists');

-- Bea joins Company A as a Subcontractor so there is one to try as Job lead.
insert into public.memberships (user_id, company_id, role, trade) values (:'bea', :'company_a', 'subcontractor', 'Electrician');

-- Alex, Admin of A, puts Sam on Overbury Avenue: the Job appears for Sam.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  format($$ select public.assign_to_job(%L, %L) $$, :'job_a', :'sam'),
  'an Admin assigns a Site team member to a Job'
);
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select results_eq($$ select id from public.jobs $$, $$ values ('30000000-0000-4000-8000-0000000000a1'::uuid) $$, 'the Job appears for Sam once assigned');
select results_eq(
  $$ select user_id, is_job_lead from public.assignments order by user_id $$,
  $$ values ('10000000-0000-4000-8000-000000000002'::uuid, false),
            ('10000000-0000-4000-8000-000000000004'::uuid, true),
            ('10000000-0000-4000-8000-000000000005'::uuid, false) $$,
  'Sam sees who else is on his Job'
);

-- Making Sam Job lead moves the flag from Dee: one Job lead per Job.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.assign_to_job(:'job_a', :'sam', true);
select results_eq(
  $$ select user_id from public.assignments where job_id = '30000000-0000-4000-8000-0000000000a1' and is_job_lead $$,
  $$ values ('10000000-0000-4000-8000-000000000002'::uuid) $$,
  'marking a new Job lead replaces the old one'
);
select public.assign_to_job(:'job_a', :'sam', false);
select is(
  (select count(*) from public.assignments where job_id = :'job_a' and is_job_lead),
  0::bigint,
  'an Admin can take the Job lead flag away'
);

-- Only a Site team member can be Job lead.
select throws_ok(
  format($$ select public.assign_to_job(%L, %L, true) $$, :'job_a', :'bea'),
  'P0001',
  'Only a Site team member can be Job lead',
  'a Subcontractor cannot be Job lead'
);
select throws_ok(
  format($$ select public.assign_to_job(%L, %L, true) $$, :'job_a', :'alex'),
  'P0001',
  'Only a Site team member can be Job lead',
  'an Admin cannot be Job lead'
);
select lives_ok(
  format($$ select public.assign_to_job(%L, %L) $$, :'job_a', :'bea'),
  'a Subcontractor can be assigned without the Job lead flag'
);
select throws_ok(
  format($$ select public.assign_to_job(%L, %L) $$, :'job_a', :'cleo'),
  'P0001',
  'That person is not a Member of this Company',
  'an Admin cannot assign a non-Member through people management'
);
select throws_ok(
  format($$ select public.assign_to_job(%L, %L) $$, '30000000-0000-4000-8000-0000000000ff', :'sam'),
  'P0001',
  'Job not found',
  'assigning to an unknown Job fails'
);

-- The database itself refuses a non-Site-team Job lead, whoever writes it.
reset role;
select throws_ok(
  format($$ update public.assignments set is_job_lead = true where job_id = %L and user_id = %L $$, :'job_a', :'bea'),
  'P0001',
  'Only a Site team member can be Job lead',
  'a direct write cannot make a Subcontractor Job lead'
);
select throws_ok(
  format($$ insert into public.assignments (job_id, user_id, company_id) values (%L, %L, %L) $$, :'job_a', :'alex', :'company_b'),
  '23503',
  null,
  'an Assignment always carries its Job''s Company'
);
set local role authenticated;

-- Sam, Site team, cannot manage Assignments.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  format($$ select public.assign_to_job(%L, %L, true) $$, :'job_a', :'sam'),
  'P0001',
  'Only an Admin can manage Assignments',
  'a Site team member cannot make himself Job lead'
);
select throws_ok(
  format($$ select public.unassign_from_job(%L, %L) $$, :'job_a', :'dee'),
  'P0001',
  'Only an Admin can manage Assignments',
  'a Site team member cannot take someone off a Job'
);
select throws_ok(
  format($$ insert into public.assignments (job_id, user_id, company_id) values (%L, %L, %L) $$, :'job_a', :'sam', :'company_a'),
  '42501',
  null,
  'nobody writes assignments directly'
);

-- Cleo, the Client, sees only her own Assignment.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select results_eq(
  $$ select user_id from public.assignments $$,
  $$ values ('10000000-0000-4000-8000-000000000005'::uuid) $$,
  'a Client sees only her own Assignment'
);

-- Bea, Admin of B, cannot see or change Company A's Assignments, even as a Member of A.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
reset role;
delete from public.memberships where user_id = :'bea' and company_id = :'company_a';
set local role authenticated;
select is((select count(*) from public.assignments where company_id = :'company_a'), 0::bigint, 'Bea sees no Company A Assignments');
select throws_ok(
  format($$ select public.assign_to_job(%L, %L) $$, :'job_a', :'bea'),
  'P0001',
  'Job not found',
  'an Admin of Company B cannot assign anyone to a Company A Job'
);
select throws_ok(
  format($$ select public.unassign_from_job(%L, %L) $$, :'job_a', :'dee'),
  'P0001',
  'Job not found',
  'an Admin of Company B cannot take anyone off a Company A Job'
);
select throws_ok(
  format($$ select public.assign_to_job(%L, %L) $$, :'job_b', :'sam'),
  'P0001',
  'That person is not a Member of this Company',
  'an Admin of Company B cannot pull a Company A Member onto a Company B Job'
);
update public.assignments set is_job_lead = false where job_id = :'job_a';
delete from public.assignments where job_id = :'job_a';
reset role;
select is((select count(*) from public.assignments where job_id = :'job_a'), 3::bigint, 'Bea''s writes left Company A''s Assignments alone');
select is((select count(*) from public.assignments where user_id = :'bea'), 0::bigint, 'Bea''s Company A Assignment went with her Membership');
set local role authenticated;

-- Alex takes Sam off the Job: it disappears for Sam on the next query.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(format($$ select public.unassign_from_job(%L, %L) $$, :'job_a', :'sam'), 'an Admin takes someone off a Job');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*) from public.jobs), 0::bigint, 'the Job disappears for Sam once unassigned');
select ok(not public.is_assigned(:'job_a'), 'is_assigned is false for Sam straight away');

-- A Job lead whose Role changes away from Site team stops being Job lead.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.assign_to_job(:'job_a', :'dee', true);
select public.change_member_role(:'company_a', :'dee', 'subcontractor');
select is(
  (select is_job_lead from public.assignments where job_id = :'job_a' and user_id = :'dee'),
  false,
  'changing a Job lead''s Role away from Site team clears the Job lead flag'
);
select is(
  (select count(*) from public.assignments where job_id = :'job_a' and user_id = :'dee'),
  1::bigint,
  'the person stays on the Job'
);

-- Removing a Job removes its Assignments.
delete from public.jobs where id = :'job_a';
reset role;
select is((select count(*) from public.assignments where job_id = :'job_a'), 0::bigint, 'a removed Job takes its Assignments with it');
select is((select count(*) from public.assignments where job_id = :'job_b'), 1::bigint, 'Company B''s Assignments are untouched');

select * from finish();
rollback;
