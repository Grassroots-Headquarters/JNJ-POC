-- An Invite can bring the invitee straight onto a Job: accepting it adds the
-- Assignment along with the Membership, so the Job is waiting in the Mobile
-- app when they first log in (spec #23 first slice; the guided first Job
-- invites people this way).

alter table public.invites
  add column job_id uuid references public.jobs (id) on delete set null;
create index invites_job_id_idx on public.invites (job_id);

-- create_invite gains an optional Job, which must belong to the Company.
drop function public.create_invite(uuid, text, public.role, text);

create function public.create_invite(company uuid, phone text, role public.role, full_name text default null, job uuid default null)
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
  the_job uuid := job;
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
  if the_job is not null and not exists (
    select 1 from public.jobs j where j.id = the_job and j.company_id = the_company
  ) then
    raise exception 'Job not found';
  end if;
  select u.id into invitee from auth.users u where u.phone = substr(normalised, 2);
  if invitee is not null and exists (
    select 1 from public.memberships m where m.user_id = invitee and m.company_id = the_company
  ) then
    raise exception 'That person is already a Member of this Company';
  end if;

  insert into public.invites (company_id, phone, role, full_name, code, created_by, job_id)
  values (the_company, normalised, the_role, the_name, public.generate_invite_code(), auth.uid(), the_job)
  returning * into created;
  return created;
end;
$$;

revoke execute on function public.create_invite(uuid, text, public.role, text, uuid) from public, anon;
grant execute on function public.create_invite(uuid, text, public.role, text, uuid) to authenticated, service_role;

-- accept_invite also adds the Assignment when the Invite carries a Job.
create or replace function public.accept_invite(code text, full_name text, trade text default null)
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

  if found_invite.job_id is not null then
    insert into public.assignments (job_id, user_id, company_id)
    values (found_invite.job_id, caller, found_invite.company_id)
    on conflict on constraint assignments_pkey do nothing;
  end if;

  if the_name is not null then
    update public.profiles set full_name = the_name where user_id = caller;
  end if;

  update public.invites set accepted_at = now(), accepted_by = caller where id = found_invite.id;
  return found_invite.company_id;
end;
$$;
