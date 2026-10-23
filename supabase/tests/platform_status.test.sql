begin;
select plan(4);

select has_table('public', 'platform_status', 'platform_status table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_status'::regclass),
  'row level security is enabled on platform_status'
);

-- An anonymous visitor (the "connected" screens before login) can read it.
set local role anon;
select results_eq(
  $$ select message from public.platform_status where id = 1 $$,
  $$ values ('connected'::text) $$,
  'anon can read the seeded platform_status row'
);

-- A logged-in User can read it too.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select message from public.platform_status where id = 1 $$,
  $$ values ('connected'::text) $$,
  'authenticated can read the seeded platform_status row'
);

reset role;
select * from finish();
rollback;
