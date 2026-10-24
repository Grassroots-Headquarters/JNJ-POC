-- Review fix: an Invite never changes an existing Member's Role. A Member who
-- opens an older Invite keeps the Role they have, so a late Invite cannot
-- demote an Admin (or the only Admin) or promote anyone; Roles change only
-- through change_member_role. The trade is only ever set for a Subcontractor.
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
  values (caller, found_invite.company_id, found_invite.role,
          case when found_invite.role = 'subcontractor' then the_trade end)
  on conflict (user_id, company_id) do update
    set trade = case
      when public.memberships.role = 'subcontractor' then coalesce(excluded.trade, public.memberships.trade)
      else public.memberships.trade
    end;

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
