-- An Admin can invite someone straight onto a Job: accepting the Invite adds
-- the Membership and the Assignment, so the Job is waiting for them.
begin;
select plan(9);

\set alex '10000000-0000-4000-8000-000000000001'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'
\set job_a '30000000-0000-4000-8000-0000000000a1'
\set job_b '30000000-0000-4000-8000-0000000000b1'
\set ivy '10000000-0000-4000-8000-0000000000e1'

select has_function('public', 'create_invite', array['uuid', 'text', 'public.role', 'text', 'uuid'], 'create_invite(company, phone, role, full_name, job) exists');

-- A brand-new User with the invited number (+447700900013).
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at)
values (:'ivy', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '447700900013', now());

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from public.create_invite(:'company_a', '07700 900013', 'site_team', 'Ivy Invitee', :'job_a') \gset invite_
select is(:'invite_job_id'::uuid, :'job_a'::uuid, 'the Invite records the Job it brings the invitee onto');
select throws_ok(
  format($$ select public.create_invite(%L, '07700 900014', 'site_team', null, %L) $$, :'company_a', :'job_b'),
  'P0001',
  'Job not found',
  'an Admin cannot invite someone onto another Company''s Job'
);
select is(
  (select job_id from public.create_invite(:'company_a', '07700 900015', 'site_team')),
  null,
  'an Invite without a Job still works'
);

-- Before accepting, Ivy sees no Job.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000e1", "role": "authenticated"}';
select is((select count(*) from public.jobs), 0::bigint, 'the invitee sees no Job before accepting');
select is(public.accept_invite(:'invite_code', 'Ivy Invitee'), :'company_a'::uuid, 'Ivy accepts the Invite');
select results_eq($$ select id from public.jobs $$, $$ values ('30000000-0000-4000-8000-0000000000a1'::uuid) $$, 'the Job is waiting for Ivy once she joins');
select results_eq(
  $$ select is_job_lead from public.assignments where user_id = '10000000-0000-4000-8000-0000000000e1' $$,
  $$ values (false) $$,
  'Ivy is on the Job, not yet as Job lead'
);

-- A Job removed while the Invite is pending leaves the Invite usable without it.
reset role;
delete from public.jobs where id = :'job_a';
select is((select job_id from public.invites where id = :'invite_id'), null, 'removing the Job clears it from the Invite');

select * from finish();
rollback;
