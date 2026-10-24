-- An Invite never changes the Role of someone who is already a Member: an
-- old Invite accepted late must not demote an Admin, least of all the last.
begin;
select plan(4);

\set alex '10000000-0000-4000-8000-000000000001'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set ivy '10000000-0000-4000-8000-0000000000e2'

-- A User who has not joined yet, invited twice (+447700900019).
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at)
values (:'ivy', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '447700900019', now());

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select code as admin_code from public.create_invite(:'company_a', '07700 900019', 'admin') \gset
select code as site_code from public.create_invite(:'company_a', '07700 900019', 'site_team') \gset

-- Ivy joins as an Admin, then Alex steps down, so Ivy is the only Admin.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000e2", "role": "authenticated"}';
select public.accept_invite(:'admin_code', 'Ivy Invitee');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.change_member_role(:'company_a', :'alex', 'site_team');

-- Ivy now opens the older Site team Invite.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000e2", "role": "authenticated"}';
select is(public.accept_invite(:'site_code', 'Ivy Invitee'), :'company_a'::uuid, 'the older Invite can still be used');
select is(public.membership_role(:'company_a'), 'admin'::public.role, 'Ivy keeps her Admin Role');

reset role;
select is(
  (select count(*) from public.memberships where company_id = :'company_a' and role = 'admin'),
  1::bigint,
  'Company A still has an Admin'
);
select is(
  (select trade from public.memberships where company_id = :'company_a' and user_id = :'ivy'),
  null,
  'an Admin is not given a trade by a later Invite'
);

select * from finish();
rollback;
