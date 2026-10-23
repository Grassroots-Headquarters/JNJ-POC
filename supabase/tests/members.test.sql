-- Admins change Roles and remove Memberships; both apply on the next query
-- and never reach across Companies (ADR 0007).
begin;
select plan(13);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set dee  '10000000-0000-4000-8000-000000000004'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'

select has_function('public', 'change_member_role', array['uuid', 'uuid', 'public.role'], 'change_member_role(company, user_id, role) exists');
select has_function('public', 'remove_member', array['uuid', 'uuid'], 'remove_member(company, user_id) exists');

-- Sam (Site team) cannot manage people.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.change_member_role('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002', 'admin') $$,
  'P0001',
  'Only an Admin can change Roles',
  'a Site team member cannot promote themselves'
);
select throws_ok(
  $$ select public.remove_member('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'Only an Admin can remove people',
  'a Site team member cannot remove an Admin'
);

-- Bea (Admin of B) cannot touch Company A's people, even Dee who is in both.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$ select public.change_member_role('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000004', 'admin') $$,
  'P0001',
  'Only an Admin can change Roles',
  'an Admin of Company B cannot change a Role in Company A'
);
select throws_ok(
  $$ select public.remove_member('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000004') $$,
  'P0001',
  'Only an Admin can remove people',
  'an Admin of Company B cannot remove a Company A Membership'
);
-- The last Admin of B cannot step down or leave.
select throws_ok(
  $$ select public.change_member_role('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003', 'site_team') $$,
  'P0001',
  'A Company needs at least one Admin',
  'the last Admin cannot demote themselves'
);
select throws_ok(
  $$ select public.remove_member('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003') $$,
  'P0001',
  'A Company needs at least one Admin',
  'the last Admin cannot remove themselves'
);

-- Alex (Admin of A) promotes Sam; Sam's new Role applies on his next query.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.change_member_role(:'company_a', :'sam', 'admin');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(public.is_admin(:'company_a'), 'Sam is an Admin on the very next query');

-- Now that Sam is an Admin too, Alex can step down to Site team, and Sam removes Dee.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.change_member_role(:'company_a', :'alex', 'site_team');
select ok(not public.is_admin(:'company_a'), 'Alex''s demotion applies to himself at once');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select public.remove_member(:'company_a', :'dee');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select results_eq(
  $$ select name from public.companies order by name $$,
  $$ values ('Hart Builders'::text) $$,
  'Dee loses Company A on her next query and keeps Company B'
);
select is(public.membership_role(:'company_b'), 'subcontractor'::public.role, 'Dee''s Company B Membership is untouched');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.remove_member('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000005') $$,
  'P0001',
  'That person is not a Member of this Company',
  'removing someone who is not a Member is reported'
);

reset role;
select * from finish();
rollback;
