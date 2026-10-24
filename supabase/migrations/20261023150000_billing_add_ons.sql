-- Billing (ADR 0008): each Company is a Stripe customer; each Add-on is a
-- monthly Stripe subscription item. The Add-on state in add_on_subscriptions
-- is written only by the stripe-webhook Edge Function through
-- apply_stripe_subscription (service_role), never by the apps.

-- One Stripe customer per Company, and the address Stripe sends receipts to.
-- Email is for billing receipts only and never a way to log in (ADR 0005).
alter table public.companies
  add column stripe_customer_id text unique,
  add column billing_email text check (billing_email is null or billing_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create type public.add_on as enum ('client_portal');

-- Mirrors the Stripe subscription for one Add-on of one Company. `status` is
-- Stripe's own status string; `active` is what the apps and policies read.
-- past_due keeps the Add-on on while Stripe retries; canceled, unpaid and
-- incomplete_expired (an unrecovered failure) switch it off.
create table public.add_on_subscriptions (
  company_id uuid not null references public.companies (id) on delete cascade,
  add_on public.add_on not null,
  stripe_subscription_id text not null unique,
  stripe_subscription_item_id text,
  status text not null,
  current_period_end timestamptz,
  active boolean not null generated always as (status in ('active', 'trialing', 'past_due')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, add_on)
);

-- Stripe delivers events more than once and out of order; the webhook records
-- each event id before acting so a replay is a no-op. Service role only.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- The Referral free month is granted once, when the referred Company first
-- pays for an Add-on; the coupon is applied to both Companies' subscriptions.
create table public.referral_rewards (
  referred_company_id uuid primary key references public.companies (id) on delete cascade,
  referring_company_id uuid not null references public.companies (id) on delete cascade,
  referred_subscription_id text not null,
  referring_subscription_id text,
  coupon text not null default 'referral-free-month',
  granted_at timestamptz not null default now()
);
create index referral_rewards_referring_company_id_idx on public.referral_rewards (referring_company_id);

alter table public.add_on_subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.referral_rewards enable row level security;

-- Members read their own Company's Add-on state (both apps need to know
-- whether the Client Portal is on). No insert, update or delete policy: the
-- only writer is apply_stripe_subscription below.
create policy "Members read their Company's Add-ons"
  on public.add_on_subscriptions for select
  to authenticated
  using (public.is_member(company_id));

-- Written by the webhook as service_role. Called with a subscription id for an
-- Add-on the Company already has under a different subscription, a terminal
-- status is ignored: the death of an old subscription must not switch off a
-- newer one. Null item id or period end keep the stored values.
create function public.apply_stripe_subscription(
  company uuid,
  add_on public.add_on,
  subscription_id text,
  item_id text,
  status text,
  period_end timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  existing public.add_on_subscriptions%rowtype;
begin
  if company is null or subscription_id is null or coalesce(status, '') = '' then
    raise exception 'company, subscription_id and status are required';
  end if;

  select * into existing
  from public.add_on_subscriptions s
  where s.company_id = company and s.add_on = apply_stripe_subscription.add_on
  for update;

  if found
     and existing.stripe_subscription_id <> subscription_id
     and apply_stripe_subscription.status not in ('active', 'trialing', 'past_due') then
    return;
  end if;

  insert into public.add_on_subscriptions as s
    (company_id, add_on, stripe_subscription_id, stripe_subscription_item_id, status, current_period_end)
  values
    (company, apply_stripe_subscription.add_on, subscription_id, item_id, apply_stripe_subscription.status, period_end)
  on conflict (company_id, add_on) do update set
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_subscription_item_id = coalesce(excluded.stripe_subscription_item_id, s.stripe_subscription_item_id),
    status = excluded.status,
    current_period_end = coalesce(excluded.current_period_end, s.current_period_end),
    updated_at = now();
end;
$$;

-- Is this Add-on on for the Company? Members (and the service role) get the
-- answer; anyone else is told false, so one Company cannot probe another.
create function public.company_has_add_on(company uuid, add_on public.add_on)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.active
      from public.add_on_subscriptions s
      where s.company_id = company
        and s.add_on = company_has_add_on.add_on
        and (auth.uid() is null or public.is_member(company))
    ),
    false
  );
$$;

revoke execute on function public.apply_stripe_subscription(uuid, public.add_on, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription(uuid, public.add_on, text, text, text, timestamptz)
  to service_role;

revoke execute on function public.company_has_add_on(uuid, public.add_on) from public, anon;
grant execute on function public.company_has_add_on(uuid, public.add_on) to authenticated, service_role;
