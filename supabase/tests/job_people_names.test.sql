-- The names of the people on a Job are visible to those who can see the
-- Job's Assignments, including a Client, who shares no Company (ADR 0007).
begin;
select plan(4);

\set cleo '10000000-0000-4000-8000-000000000005'

set local role authenticated;

-- Alex, Admin of A, sees the name of Overbury Avenue's Client.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select full_name from public.profiles where user_id = :'cleo'), 'Cleo Client', 'an Admin sees the name of a Client on their Job');

-- Dee, on the Job, sees it too.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select is((select full_name from public.profiles where user_id = :'cleo'), 'Cleo Client', 'someone on the Job sees the Client''s name');

-- Sam, on no Job, and Bea, of Company B, do not.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*) from public.profiles where user_id = :'cleo'), 0::bigint, 'a Member who is not on the Job cannot see the Client');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select is((select count(*) from public.profiles where user_id = :'cleo'), 0::bigint, 'another Company''s Admin cannot see the Client');

reset role;
select * from finish();
rollback;
