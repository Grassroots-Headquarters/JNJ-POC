-- A removed Membership and a changed Role apply on the very next query (ADR 0007).
begin;
select plan(8);

\set sam '10000000-0000-4000-8000-000000000002'
\set company_a '20000000-0000-4000-8000-00000000000a'

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*) from public.companies where id = :'company_a'), 1::bigint, 'Sam sees Company A while a Member');
select is(public.membership_role(:'company_a'), 'site_team'::public.role, 'Sam is Site team');
select ok(not public.is_admin(:'company_a'), 'Sam is not an Admin');

-- An Admin changes Sam's Role to Admin.
reset role;
update public.memberships set role = 'admin' where user_id = :'sam' and company_id = :'company_a';

set local role authenticated;
select is(public.membership_role(:'company_a'), 'admin'::public.role, 'The changed Role applies on the next query');
select ok(public.is_admin(:'company_a'), 'is_admin is true straight away');
update public.companies set name = 'Renamed by Sam' where id = :'company_a';
reset role;
select is((select name from public.companies where id = :'company_a'), 'Renamed by Sam', 'The new Role grants Admin rights at once');

-- The Membership is removed.
delete from public.memberships where user_id = :'sam' and company_id = :'company_a';

set local role authenticated;
select is((select count(*) from public.companies where id = :'company_a'), 0::bigint, 'The removed Membership cuts off Company A on the next query');
select ok(not public.is_member(:'company_a'), 'is_member is false straight away');

reset role;
select * from finish();
rollback;
