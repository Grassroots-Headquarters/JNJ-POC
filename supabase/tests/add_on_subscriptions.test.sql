-- Add-on state follows Stripe and stays inside the Company (ADR 0007, ADR 0008).
-- Seeded Users: Alex Admin (A), Sam Site (A), Bea Boss (B).
begin;
select plan(27);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'

select has_table('public', 'add_on_subscriptions', 'add_on_subscriptions table exists');
select has_table('public', 'stripe_events', 'stripe_events table exists');
select has_table('public', 'referral_rewards', 'referral_rewards table exists');
select has_enum('public', 'add_on', 'add_on enum exists');
select has_column('public', 'companies', 'stripe_customer_id', 'companies has a Stripe customer id');
select has_column('public', 'companies', 'billing_email', 'companies has a billing email');
select ok((select relrowsecurity from pg_class where oid = 'public.add_on_subscriptions'::regclass), 'RLS is on for add_on_subscriptions');
select ok((select relrowsecurity from pg_class where oid = 'public.stripe_events'::regclass), 'RLS is on for stripe_events');
select ok((select relrowsecurity from pg_class where oid = 'public.referral_rewards'::regclass), 'RLS is on for referral_rewards');

-- Before Stripe has said anything, the Client Portal is off.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select ok(not public.company_has_add_on(:'company_a', 'client_portal'), 'Company A starts without the Client Portal');

-- Nobody writes Add-on state through the API: not an Admin by insert, nor by
-- calling the webhook's function.
select throws_ok(
  $$ insert into public.add_on_subscriptions (company_id, add_on, stripe_subscription_id, status)
     values ('20000000-0000-4000-8000-00000000000a', 'client_portal', 'sub_forged', 'active') $$,
  '42501',
  'new row violates row-level security policy for table "add_on_subscriptions"',
  'an Admin cannot switch an Add-on on by inserting'
);
select throws_ok(
  $$ select public.apply_stripe_subscription('20000000-0000-4000-8000-00000000000a', 'client_portal', 'sub_forged', null, 'active', null, now()) $$,
  '42501',
  'permission denied for function apply_stripe_subscription',
  'authenticated cannot call apply_stripe_subscription'
);

-- Stripe (the webhook, as service_role) switches it on.
set local role service_role;
select lives_ok(
  $$ select public.apply_stripe_subscription('20000000-0000-4000-8000-00000000000a', 'client_portal', 'sub_a1', 'si_a1', 'active', now() + interval '30 days', '2026-10-01 10:00') $$,
  'service_role applies a paid subscription'
);

-- Sam, Site team of A, sees that it is on.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(public.company_has_add_on(:'company_a', 'client_portal'), 'a Member of A sees the Client Portal is on');
select results_eq(
  $$ select add_on::text, status, active from public.add_on_subscriptions where company_id = '20000000-0000-4000-8000-00000000000a' $$,
  $$ values ('client_portal'::text, 'active'::text, true) $$,
  'a Member of A reads A''s Add-on state'
);

-- Bea, Admin of B, can neither read nor change A's Add-on state.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  (select count(*) from public.add_on_subscriptions where company_id = :'company_a'),
  0::bigint,
  'Bea cannot read Company A''s Add-on state'
);
select ok(not public.company_has_add_on(:'company_a', 'client_portal'), 'company_has_add_on tells Bea nothing about Company A');
update public.add_on_subscriptions set status = 'canceled' where company_id = :'company_a';
delete from public.add_on_subscriptions where company_id = :'company_a';
select is((select count(*) from public.stripe_events), 0::bigint, 'stripe_events is not readable through the API');
select is((select count(*) from public.referral_rewards), 0::bigint, 'referral_rewards is not readable through the API');

reset role;
select is(
  (select status from public.add_on_subscriptions where company_id = :'company_a' and add_on = 'client_portal'),
  'active',
  'Company A''s Add-on is unchanged by Bea'
);

-- Stripe moves it through past_due (still on) to canceled (off).
set local role service_role;
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'past_due', null, '2026-10-02 10:00');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(public.company_has_add_on(:'company_a', 'client_portal'), 'past_due keeps the Client Portal on while Stripe retries');

-- An event from before the payment failed, delivered late, changes nothing.
set local role service_role;
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'active', null, '2026-10-01 12:00');
reset role;
select is(
  (select status from public.add_on_subscriptions where company_id = :'company_a'),
  'past_due',
  'an event older than the last one applied is ignored'
);

set local role service_role;
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'canceled', null, '2026-10-03 10:00');
-- Nothing brings a cancelled subscription back on: not a late paid invoice,
-- not even an event stamped after the cancellation.
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'active', null, '2026-10-02 12:00');
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'active', null, '2026-10-04 10:00');
reset role;
select is(
  (select status from public.add_on_subscriptions where company_id = :'company_a'),
  'canceled',
  'a cancelled subscription stays cancelled'
);

set local role service_role;
-- The death of an older, replaced subscription does not switch off the current one.
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a2', 'si_a2', 'active', null, '2026-10-05 10:00');
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a1', null, 'canceled', null, '2026-10-06 10:00');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(public.company_has_add_on(:'company_a', 'client_portal'), 'a canceled event for a replaced subscription is ignored');

set local role service_role;
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a2', null, 'unpaid', null, '2026-10-07 10:00');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(not public.company_has_add_on(:'company_a', 'client_portal'), 'unpaid switches the Client Portal off');

-- unpaid is not final: paying the open invoice switches it back on.
set local role service_role;
select public.apply_stripe_subscription(:'company_a', 'client_portal', 'sub_a2', null, 'active', null, '2026-10-08 10:00');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select ok(public.company_has_add_on(:'company_a', 'client_portal'), 'an unpaid subscription comes back on when paid');

set local role service_role;
select throws_ok(
  $$ select public.apply_stripe_subscription('20000000-0000-4000-8000-00000000000a', 'client_portal', 'sub_a2', null, 'active', null, null) $$,
  'P0001',
  'company, subscription_id, status and event_created are required',
  'every change carries the time of the Stripe event'
);

reset role;
select * from finish();
rollback;
