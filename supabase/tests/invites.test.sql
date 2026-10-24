-- Invites: Admins send them, invitees accept them, and one Company's Invites
-- are never visible while acting in another (ADR 0007).
-- Seeded Users: Alex Admin (A), Sam Site (A), Bea Boss (B), Dee Dual (A + B), Cleo Client (none).
begin;
select plan(40);

\set alex '10000000-0000-4000-8000-000000000001'
\set sam  '10000000-0000-4000-8000-000000000002'
\set bea  '10000000-0000-4000-8000-000000000003'
\set dee  '10000000-0000-4000-8000-000000000004'
\set cleo '10000000-0000-4000-8000-000000000005'
\set company_a '20000000-0000-4000-8000-00000000000a'
\set company_b '20000000-0000-4000-8000-00000000000b'

select has_table('public', 'invites', 'invites table exists');
select has_table('public', 'outbound_sms', 'outbound_sms table exists');
select has_column('public', 'memberships', 'trade', 'memberships has a trade column for Subcontractors');
select ok((select relrowsecurity from pg_class where oid = 'public.invites'::regclass), 'RLS is on for invites');
select ok((select relrowsecurity from pg_class where oid = 'public.outbound_sms'::regclass), 'RLS is on for outbound_sms');
select has_function('public', 'create_invite', array['uuid', 'text', 'public.role', 'text'], 'create_invite(company, phone, role, full_name) exists');
select has_function('public', 'cancel_invite', array['uuid'], 'cancel_invite(invite) exists');
select has_function('public', 'resend_invite', array['uuid'], 'resend_invite(invite) exists');
select has_function('public', 'accept_invite', array['text', 'text', 'text'], 'accept_invite(code, full_name, trade) exists');
select has_function('public', 'invite_preview', array['text'], 'invite_preview(code) exists');

-- Sam (Site team) cannot invite anyone.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.create_invite('20000000-0000-4000-8000-00000000000a', '07700 900009', 'site_team') $$,
  'P0001',
  'Only an Admin can send Invites',
  'a Site team member cannot create an Invite'
);

-- Alex (Admin of A) invites a new person, typing the number the UK way.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from public.create_invite(:'company_a', '07700 900009', 'site_team', 'Ivy Invitee') \gset new_
select is(:'new_phone'::text, '+447700900009', 'the Invite stores the phone in E.164 form');
select is(:'new_role'::public.role, 'site_team'::public.role, 'the Invite carries the chosen Role');
select matches(:'new_code'::text, '^[A-HJ-NP-Z2-9]{12}$', 'the Invite gets a random single-use code');
select ok(:'new_expires_at'::timestamptz between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour', 'the Invite expires in 7 days');
select is(:'new_created_by'::uuid, :'alex'::uuid, 'the Invite records who sent it');
select throws_ok(
  $$ select public.create_invite('20000000-0000-4000-8000-00000000000a', 'call me', 'site_team') $$,
  'P0001',
  'Enter a mobile number like 07700 900123',
  'an unusable phone number is rejected'
);
select throws_ok(
  $$ select public.create_invite('20000000-0000-4000-8000-00000000000a', '+447700900002', 'admin') $$,
  'P0001',
  'That person is already a Member of this Company',
  'inviting an existing Member is rejected'
);
-- Alex can also invite an existing User of another Company (Bea, Admin of B).
select * from public.create_invite(:'company_a', '+447700900003', 'subcontractor') \gset bea_
-- Alex cannot invite anyone to Company B.
select throws_ok(
  $$ select public.create_invite('20000000-0000-4000-8000-00000000000b', '07700 900011', 'site_team') $$,
  'P0001',
  'Only an Admin can send Invites',
  'an Admin of Company A cannot invite into Company B'
);
select is((select count(*) from public.invites where company_id = :'company_a'), 2::bigint, 'Alex reads his Company''s Invites');

-- Bea, Admin of B, sees none of A's Invites and cannot cancel or resend them.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select is((select count(*) from public.invites), 0::bigint, 'Bea sees no Invites of Company A');
select throws_ok(
  format($$ select public.cancel_invite(%L) $$, :'new_id'),
  'P0001',
  'Invite not found',
  'Bea cannot cancel a Company A Invite'
);
select throws_ok(
  format($$ select public.resend_invite(%L) $$, :'new_id'),
  'P0001',
  'Invite not found',
  'Bea cannot resend a Company A Invite'
);

-- Dee is Site team in A and Subcontractor in B: Invites of neither are hers to see.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select is((select count(*) from public.invites), 0::bigint, 'Dee, a non-Admin in both Companies, sees no Invites');
-- Made an Admin of B, she sees B's Invites only, never A's.
reset role;
update public.memberships set role = 'admin' where user_id = :'dee' and company_id = :'company_b';
set local role authenticated;
select public.create_invite(:'company_b', '07700 900012', 'site_team');
select results_eq(
  $$ select company_id from public.invites $$,
  $$ values ('20000000-0000-4000-8000-00000000000b'::uuid) $$,
  'Dee as Admin of B sees only Company B Invites'
);

-- Anyone, logged in or not, can preview an Invite by its code: Company and Role, never the phone.
set local role anon;
select results_eq(
  format($$ select company_name, role, status from public.invite_preview(%L) $$, :'new_code'),
  $$ values ('JNJ Building'::text, 'site_team'::public.role, 'pending'::text) $$,
  'anon previews the Company, Role and status of a pending Invite'
);
select is((select count(*) from public.invite_preview('NOPE')), 0::bigint, 'an unknown code previews nothing');
select throws_ok(
  format($$ select public.accept_invite(%L, 'Nobody') $$, :'new_code'),
  '42501',
  'permission denied for function accept_invite',
  'anon cannot accept an Invite'
);

-- The wrong person cannot accept: Cleo's phone is not the invited one.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  format($$ select public.accept_invite(%L, 'Cleo Client') $$, :'new_code'),
  'P0001',
  'This Invite was sent to a different mobile number',
  'a User whose phone does not match cannot accept the Invite'
);

-- Bea accepts as a Subcontractor of A: she keeps one login and gains a second Membership.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  public.accept_invite(:'bea_code', 'Bea Boss', 'Electrician'),
  :'company_a'::uuid,
  'accepting returns the Company joined'
);
select results_eq(
  $$ select company_id, role, trade from public.memberships where user_id = '10000000-0000-4000-8000-000000000003' order by company_id $$,
  $$ values ('20000000-0000-4000-8000-00000000000a'::uuid, 'subcontractor'::public.role, 'Electrician'::text),
            ('20000000-0000-4000-8000-00000000000b'::uuid, 'admin'::public.role, null::text) $$,
  'Bea now has Memberships in both Companies with the right Role and trade in each'
);
select throws_ok(
  format($$ select public.accept_invite(%L, 'Bea Boss') $$, :'bea_code'),
  'P0001',
  'This Invite has already been used',
  'an Invite is single-use'
);
select is(
  (select status from public.invite_preview(:'bea_code')),
  'accepted',
  'the preview reports an accepted Invite'
);

-- Cancelled and expired Invites cannot be accepted; resending issues a fresh code.
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from public.create_invite(:'company_a', '+447700900005', 'site_team', 'Cleo') \gset cleo_
select public.cancel_invite(:'cleo_id');
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  format($$ select public.accept_invite(%L, 'Cleo Client') $$, :'cleo_code'),
  'P0001',
  'This Invite was cancelled',
  'a cancelled Invite cannot be accepted'
);
reset role;
update public.invites set expires_at = now() - interval '1 minute' where id = :'new_id';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select status from public.invite_preview(:'new_code')), 'expired', 'the preview reports an expired Invite');
select * from public.resend_invite(:'new_id') \gset resent_
select isnt(:'resent_code'::text, :'new_code'::text, 'resending issues a new code');
select ok(:'resent_expires_at'::timestamptz > now() + interval '6 days', 'resending moves the expiry forward');
select is(
  (select status from public.invite_preview(:'new_code')),
  null,
  'the old code no longer works after a resend'
);

-- outbound_sms is the fake SMS outbox: service role only.
select is((select count(*) from public.outbound_sms), 0::bigint, 'an Admin cannot read outbound_sms');
select throws_ok(
  $$ insert into public.outbound_sms ("to", body) values ('+447700900009', 'hello') $$,
  '42501',
  null,
  'an Admin cannot write outbound_sms'
);

reset role;
select * from finish();
rollback;
