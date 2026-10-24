-- Jobs and Assignments (spec #23, User stories 19-25). A User reaches a Job
-- only through an Assignment, except Admins, who run every Job in their
-- Company. Like Memberships, Assignments are looked up on every query through
-- the shared check below (ADR 0007).

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Optional while the Admin is still finding it out; the apps show "Address to follow".
  address text check (address is null or length(trim(address)) > 0),
  start_date date,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  -- Lets assignments carry the Job's Company and have the database keep them equal.
  unique (id, company_id)
);
create index jobs_company_id_idx on public.jobs (company_id);

-- A User's link to one Job. Members are assigned by Admins; a Client's
-- Assignment (no Membership) is what lets them reach their one Job.
create table public.assignments (
  job_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  is_job_lead boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id),
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade,
  -- Lets the apps read `assignments` together with `profiles(full_name)`.
  constraint assignments_user_id_profiles_fkey foreign key (user_id) references public.profiles (user_id) on delete cascade
);
create index assignments_user_id_idx on public.assignments (user_id);
create index assignments_company_id_idx on public.assignments (company_id);
-- One Job lead per Job.
create unique index assignments_one_job_lead_idx on public.assignments (job_id) where is_job_lead;

alter table public.jobs enable row level security;
alter table public.assignments enable row level security;

-- Jobs are for logged-in Users only.
revoke all on public.jobs from anon;
revoke all on public.assignments from anon;

-- The shared Assignment check: "is the calling User assigned to this Job".
-- Security definer so policies can call it without recursing into the
-- assignments policies. Never null.
create function public.is_assigned(job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a where a.job_id = job and a.user_id = auth.uid()
  );
$$;

create policy "Admins read their Company's Jobs; others the Jobs they are assigned to"
  on public.jobs for select
  to authenticated
  using (public.is_admin(company_id) or public.is_assigned(id));

create policy "Admins log Jobs in their Company"
  on public.jobs for insert
  to authenticated
  with check (public.is_admin(company_id));

create policy "Admins change their Company's Jobs"
  on public.jobs for update
  to authenticated
  using (public.is_admin(company_id))
  with check (public.is_admin(company_id));

create policy "Admins remove their Company's Jobs"
  on public.jobs for delete
  to authenticated
  using (public.is_admin(company_id));

-- A Job stays in its Company and keeps the record of who logged it.
revoke insert, update on public.jobs from authenticated;
grant insert (company_id, name, address, start_date) on public.jobs to authenticated;
grant update (name, address, start_date) on public.jobs to authenticated;

-- Admins see every Assignment in their Company; Members see who else is on
-- the Jobs they are on; everyone sees their own. A Client therefore sees only
-- their own Assignment. Writes go through the functions below.
create policy "Read Assignments on Jobs you run or are on"
  on public.assignments for select
  to authenticated
  using (
    public.is_admin(company_id)
    or user_id = (select auth.uid())
    or (public.is_member(company_id) and public.is_assigned(job_id))
  );

-- A removed Membership takes the Member off the Company's Jobs too, so access
-- ends on the next query (User story 16).
create function public.remove_assignments_with_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.assignments a where a.user_id = old.user_id and a.company_id = old.company_id;
  return old;
end;
$$;

create trigger on_membership_removed
  after delete on public.memberships
  for each row execute function public.remove_assignments_with_membership();

revoke execute on function public.remove_assignments_with_membership() from public, anon, authenticated;

-- Only a Site team member can be Job lead, however the row is written.
create function public.check_job_lead_is_site_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_job_lead and not exists (
    select 1 from public.memberships m
    where m.user_id = new.user_id and m.company_id = new.company_id and m.role = 'site_team'
  ) then
    raise exception 'Only a Site team member can be Job lead';
  end if;
  return new;
end;
$$;

create trigger check_job_lead_is_site_team
  before insert or update on public.assignments
  for each row execute function public.check_job_lead_is_site_team();

-- A Job lead whose Role changes away from Site team stays on the Job but is
-- no longer its Job lead.
create function public.clear_job_lead_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> 'site_team' then
    update public.assignments a
      set is_job_lead = false
      where a.user_id = new.user_id and a.company_id = new.company_id and a.is_job_lead;
  end if;
  return new;
end;
$$;

create trigger on_membership_role_changed
  after update of role on public.memberships
  for each row execute function public.clear_job_lead_on_role_change();

-- An Admin puts a Member of the Job's Company on the Job, or changes their
-- Job lead flag if they are already on it. Marking a new Job lead takes the
-- flag from the previous one. Returns nothing; the Job appears for the
-- Member on their next query (User story 23).
create function public.assign_to_job(job uuid, user_id uuid, job_lead boolean default false)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_job uuid := job;
  the_user uuid := user_id;
  the_lead boolean := coalesce(job_lead, false);
  the_company uuid;
begin
  select j.company_id into the_company from public.jobs j where j.id = the_job;
  if the_company is null or public.is_member(the_company) is not true then
    raise exception 'Job not found';
  end if;
  if public.is_admin(the_company) is not true then
    raise exception 'Only an Admin can manage Assignments';
  end if;
  if not exists (
    select 1 from public.memberships m where m.user_id = the_user and m.company_id = the_company
  ) then
    raise exception 'That person is not a Member of this Company';
  end if;

  if the_lead then
    update public.assignments a
      set is_job_lead = false
      where a.job_id = the_job and a.is_job_lead and a.user_id <> the_user;
  end if;

  insert into public.assignments (job_id, user_id, company_id, is_job_lead)
  values (the_job, the_user, the_company, the_lead)
  on conflict on constraint assignments_pkey do update set is_job_lead = excluded.is_job_lead;
end;
$$;

-- An Admin takes someone off a Job; it disappears for them on their next
-- query (User story 24).
create function public.unassign_from_job(job uuid, user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  the_job uuid := job;
  the_user uuid := user_id;
  the_company uuid;
begin
  select j.company_id into the_company from public.jobs j where j.id = the_job;
  if the_company is null or public.is_member(the_company) is not true then
    raise exception 'Job not found';
  end if;
  if public.is_admin(the_company) is not true then
    raise exception 'Only an Admin can manage Assignments';
  end if;
  delete from public.assignments a where a.job_id = the_job and a.user_id = the_user;
end;
$$;

revoke execute on function public.assign_to_job(uuid, uuid, boolean) from public, anon;
grant execute on function public.assign_to_job(uuid, uuid, boolean) to authenticated, service_role;
revoke execute on function public.unassign_from_job(uuid, uuid) from public, anon;
grant execute on function public.unassign_from_job(uuid, uuid) to authenticated, service_role;
revoke execute on function public.check_job_lead_is_site_team() from public, anon, authenticated;
revoke execute on function public.clear_job_lead_on_role_change() from public, anon, authenticated;

-- People on a Job can be named by anyone who can see its Assignments, which
-- covers a Client, who shares no Company (the subquery is itself filtered by
-- the assignments policy).
create policy "Users read the profiles of people on Jobs they can see"
  on public.profiles for select
  to authenticated
  using (exists (select 1 from public.assignments a where a.user_id = profiles.user_id));
