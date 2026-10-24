-- Companies, profiles and Memberships: the core of Company separation
-- (ADR 0003, ADR 0007). Roles are looked up on every query through the
-- shared functions below and are never put in the login token.

create type public.role as enum ('admin', 'site_team', 'subcontractor');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Short code another Company types at sign-up; both earn a free month later.
  referral_code text not null unique check (referral_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  referred_by_company_id uuid references public.companies (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One per auth user. Email is for billing receipts only (ADR 0005).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  billing_email text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role public.role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);
create index memberships_company_id_idx on public.memberships (company_id);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

-- Shared Membership checks used by every Company-owned table's policies.
-- Security definer so they read memberships without recursing into its
-- own policies; stable so the planner calls them once per row at most.
create function public.membership_role(company uuid)
returns public.role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.company_id = company
    and m.user_id = auth.uid();
$$;

create function public.is_member(company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.membership_role(company) is not null;
$$;

create function public.is_admin(company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.membership_role(company) = 'admin';
$$;

create policy "Members read their Companies"
  on public.companies for select
  to authenticated
  using (public.is_member(id));

create policy "Admins update their Company"
  on public.companies for update
  to authenticated
  using (public.is_admin(id))
  with check (public.is_admin(id));

create policy "Members read their Company's Memberships"
  on public.memberships for select
  to authenticated
  using (public.is_member(company_id));

create policy "Admins add Memberships to their Company"
  on public.memberships for insert
  to authenticated
  with check (public.is_admin(company_id));

create policy "Admins change Memberships in their Company"
  on public.memberships for update
  to authenticated
  using (public.is_admin(company_id))
  with check (public.is_admin(company_id));

create policy "Admins remove Memberships from their Company"
  on public.memberships for delete
  to authenticated
  using (public.is_admin(company_id));

-- A profile is visible to its owner and to anyone who shares a Company with
-- them (the memberships subquery is itself filtered by RLS).
create policy "Users read their own and their Companies' profiles"
  on public.profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.memberships m where m.user_id = profiles.user_id)
  );

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Every new auth user gets a profile; the name comes from the sign-up metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Referral codes avoid characters that are easy to misread (0/O, 1/I).
create function public.generate_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.companies c where c.referral_code = code);
  end loop;
  return code;
end;
$$;

-- Company sign-up: creates the Company and the caller's Admin Membership in
-- one step, optionally recording the referring Company (spec: Sign-up).
create function public.sign_up_company(company_name text, full_name text, referral_code text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  referrer uuid;
  new_company uuid;
  typed_code text := upper(regexp_replace(coalesce(referral_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if caller is null then
    raise exception 'You must be logged in to sign up a Company';
  end if;
  if length(trim(coalesce(company_name, ''))) = 0 then
    raise exception 'Company name is required';
  end if;
  if typed_code <> '' then
    select c.id into referrer from public.companies c where c.referral_code = typed_code;
    if referrer is null then
      raise exception 'Unknown Referral code';
    end if;
  end if;

  insert into public.companies (name, referral_code, referred_by_company_id)
  values (trim(company_name), public.generate_referral_code(), referrer)
  returning id into new_company;

  insert into public.memberships (user_id, company_id, role)
  values (caller, new_company, 'admin');

  insert into public.profiles (user_id, full_name)
  values (caller, trim(coalesce(full_name, '')))
  on conflict (user_id) do update
    set full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end;

  return new_company;
end;
$$;

-- Only logged-in Users call sign_up_company; the rest are internal.
revoke execute on function public.sign_up_company(text, text, text) from public, anon;
grant execute on function public.sign_up_company(text, text, text) to authenticated, service_role;
revoke execute on function public.generate_referral_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
