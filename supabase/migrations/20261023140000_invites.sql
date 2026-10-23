-- Invites and people management (spec #23, User stories 15-16 and 26-33).
-- An Admin invites a mobile number with a Role; the invitee accepts with a
-- single-use code from the SMS and gains a Membership on their one login
-- (ADR 0003). Every check here is done by Membership on the current query
-- (ADR 0007); nothing is read from the login token.

-- A Subcontractor works in one trade for the Company; blank for everyone else.
alter table public.memberships add column trade text;

-- Lets the apps read `memberships` together with `profiles(full_name)`.
-- Every auth user has a profile from the on_auth_user_created trigger.
alter table public.memberships
  add constraint memberships_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (user_id) on delete cascade;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- E.164, the form Supabase phone login uses.
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  role public.role not null,
  full_name text,
  -- Single-use random code carried by the SMS link.
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{12}$'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invites_company_id_idx on public.invites (company_id);

-- The fake SMS outbox: when no Twilio account is configured the send-invite
-- Edge Function records the message here and tests read it. Service role only:
-- RLS is on with no policies.
create table public.outbound_sms (
  id bigint generated always as identity primary key,
  "to" text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
alter table public.outbound_sms enable row level security;

-- Only the Company's Admins see its Invites. Writes go through the functions
-- below, so there are no insert, update or delete policies.
create policy "Admins read their Company's Invites"
  on public.invites for select
  to authenticated
  using (public.is_admin(company_id));

-- Mirror of normalisePhone in packages/shared/src/phone.ts: UK numbers with a
-- trunk 0, +44, 0044 or bare 44; other countries only when international.
create function public.normalise_phone(input text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  compact text := regexp_replace(coalesce(input, ''), '[\s().-]', '', 'g');
  international text;
begin
  if compact = '' then
    return null;
  elsif compact like '+%' then
    international := substr(compact, 2);
  elsif compact like '00%' then
    international := substr(compact, 3);
  elsif compact like '0%' then
    international := '44' || substr(compact, 2);
  elsif compact like '44%' then
    international := compact;
  else
    return null;
  end if;
  if international !~ '^[1-9][0-9]{7,14}$' then
    return null;
  end if;
  if international like '44%' and length(international) <> 12 then
    return null;
  end if;
  return '+' || international;
end;
$$;

-- Invite codes avoid characters that are easy to misread (0/O, 1/I).
create function public.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  loop
    new_code := '';
    for i in 1..12 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.invites i where i.code = new_code);
  end loop;
  return new_code;
end;
$$;

-- pending | accepted | cancelled | expired, derived from the timestamps.
create function public.invite_status(accepted_at timestamptz, cancelled_at timestamptz, expires_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when accepted_at is not null then 'accepted'
    when cancelled_at is not null then 'cancelled'
    when expires_at <= now() then 'expired'
    else 'pending'
  end;
$$;

-- An Admin invites a mobile number with a Role. The SMS itself is sent by the
-- send-invite Edge Function once this row exists.
create function public.create_invite(company uuid, phone text, role public.role, full_name text default null)
returns public.invites
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_company uuid := company;
  the_role public.role := role;
  the_name text := nullif(trim(coalesce(full_name, '')), '');
  normalised text := public.normalise_phone(phone);
  invitee uuid;
  created public.invites;
begin
  if public.is_admin(the_company) is not true then
    raise exception 'Only an Admin can send Invites';
  end if;
  if normalised is null then
    raise exception 'Enter a mobile number like 07700 900123';
  end if;
  select u.id into invitee from auth.users u where u.phone = substr(normalised, 2);
  if invitee is not null and exists (
    select 1 from public.memberships m where m.user_id = invitee and m.company_id = the_company
  ) then
    raise exception 'That person is already a Member of this Company';
  end if;

  insert into public.invites (company_id, phone, role, full_name, code, created_by)
  values (the_company, normalised, the_role, the_name, public.generate_invite_code(), auth.uid())
  returning * into created;
  return created;
end;
$$;

create function public.cancel_invite(invite uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_invite uuid := invite;
  found_invite public.invites;
begin
  select * into found_invite from public.invites i where i.id = the_invite;
  if found_invite.id is null or public.is_admin(found_invite.company_id) is not true then
    raise exception 'Invite not found';
  end if;
  if found_invite.accepted_at is not null then
    raise exception 'This Invite has already been used';
  end if;
  update public.invites set cancelled_at = coalesce(cancelled_at, now()) where id = the_invite;
end;
$$;

-- A fresh code and expiry for a pending or expired Invite; the app then calls
-- send-invite again with the returned row.
create function public.resend_invite(invite uuid)
returns public.invites
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_invite uuid := invite;
  found_invite public.invites;
begin
  select * into found_invite from public.invites i where i.id = the_invite;
  if found_invite.id is null or public.is_admin(found_invite.company_id) is not true then
    raise exception 'Invite not found';
  end if;
  if found_invite.accepted_at is not null then
    raise exception 'This Invite has already been used';
  end if;
  if found_invite.cancelled_at is not null then
    raise exception 'This Invite was cancelled';
  end if;
  update public.invites
    set code = public.generate_invite_code(), expires_at = now() + interval '7 days'
    where id = the_invite
    returning * into found_invite;
  return found_invite;
end;
$$;

-- Called by the logged-in invitee. Their login's phone must be the invited
-- number. A User already in another Company simply gains a Membership here.
-- Returns the Company joined.
create function public.accept_invite(code text, full_name text, trade text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_code text := code;
  the_name text := nullif(trim(coalesce(full_name, '')), '');
  the_trade text := nullif(trim(coalesce(trade, '')), '');
  caller uuid := auth.uid();
  caller_phone text;
  found_invite public.invites;
begin
  if caller is null then
    raise exception 'You must be logged in to accept an Invite';
  end if;
  select * into found_invite from public.invites i where i.code = the_code;
  if found_invite.id is null then
    raise exception 'Invite not found';
  end if;
  if found_invite.cancelled_at is not null then
    raise exception 'This Invite was cancelled';
  end if;
  if found_invite.accepted_at is not null then
    raise exception 'This Invite has already been used';
  end if;
  if found_invite.expires_at <= now() then
    raise exception 'This Invite has expired';
  end if;
  select u.phone into caller_phone from auth.users u where u.id = caller;
  if caller_phone is null or '+' || caller_phone <> found_invite.phone then
    raise exception 'This Invite was sent to a different mobile number';
  end if;

  insert into public.memberships (user_id, company_id, role, trade)
  values (caller, found_invite.company_id, found_invite.role, the_trade)
  on conflict (user_id, company_id) do update
    set role = excluded.role,
        trade = coalesce(excluded.trade, public.memberships.trade);

  if the_name is not null then
    update public.profiles set full_name = the_name where user_id = caller;
  end if;

  update public.invites set accepted_at = now(), accepted_by = caller where id = found_invite.id;
  return found_invite.company_id;
end;
$$;

-- What the public Invite page and the apps show before accepting: the Company,
-- the Role and the status. Never the phone. The invited name is included only
-- for the logged-in User whose phone the Invite was sent to.
create function public.invite_preview(code text)
returns table (company_name text, role public.role, status text, invited_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  the_code text := code;
  caller_phone text;
begin
  select u.phone into caller_phone from auth.users u where u.id = auth.uid();
  return query
    select c.name,
           i.role,
           public.invite_status(i.accepted_at, i.cancelled_at, i.expires_at),
           case when caller_phone is not null and '+' || caller_phone = i.phone then i.full_name end
    from public.invites i
    join public.companies c on c.id = i.company_id
    where i.code = the_code;
end;
$$;

-- Admins change Roles; the change applies on the next query (User story 15).
-- A Company always keeps at least one Admin.
create function public.change_member_role(company uuid, user_id uuid, role public.role)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_company uuid := company;
  the_user uuid := user_id;
  the_role public.role := role;
  existing_role public.role;
begin
  if public.is_admin(the_company) is not true then
    raise exception 'Only an Admin can change Roles';
  end if;
  select m.role into existing_role from public.memberships m where m.company_id = the_company and m.user_id = the_user;
  if existing_role is null then
    raise exception 'That person is not a Member of this Company';
  end if;
  if existing_role = 'admin' and the_role <> 'admin' and (
    select count(*) from public.memberships m where m.company_id = the_company and m.role = 'admin'
  ) = 1 then
    raise exception 'A Company needs at least one Admin';
  end if;
  update public.memberships m set role = the_role where m.company_id = the_company and m.user_id = the_user;
end;
$$;

-- Admins remove Memberships; access is cut off on the next query (User story 16).
create function public.remove_member(company uuid, user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_company uuid := company;
  the_user uuid := user_id;
  existing_role public.role;
begin
  if public.is_admin(the_company) is not true then
    raise exception 'Only an Admin can remove people';
  end if;
  select m.role into existing_role from public.memberships m where m.company_id = the_company and m.user_id = the_user;
  if existing_role is null then
    raise exception 'That person is not a Member of this Company';
  end if;
  if existing_role = 'admin' and (
    select count(*) from public.memberships m where m.company_id = the_company and m.role = 'admin'
  ) = 1 then
    raise exception 'A Company needs at least one Admin';
  end if;
  delete from public.memberships m where m.company_id = the_company and m.user_id = the_user;
end;
$$;

-- Logged-in Users call the Invite and people functions; invite_preview is
-- public (the Invite page is shown before login); the rest are internal.
revoke execute on function public.create_invite(uuid, text, public.role, text) from public, anon;
grant execute on function public.create_invite(uuid, text, public.role, text) to authenticated, service_role;
revoke execute on function public.cancel_invite(uuid) from public, anon;
grant execute on function public.cancel_invite(uuid) to authenticated, service_role;
revoke execute on function public.resend_invite(uuid) from public, anon;
grant execute on function public.resend_invite(uuid) to authenticated, service_role;
revoke execute on function public.accept_invite(text, text, text) from public, anon;
grant execute on function public.accept_invite(text, text, text) to authenticated, service_role;
grant execute on function public.invite_preview(text) to anon, authenticated, service_role;
revoke execute on function public.change_member_role(uuid, uuid, public.role) from public, anon;
grant execute on function public.change_member_role(uuid, uuid, public.role) to authenticated, service_role;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated, service_role;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.normalise_phone(text) from public, anon, authenticated;
revoke execute on function public.invite_status(timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
