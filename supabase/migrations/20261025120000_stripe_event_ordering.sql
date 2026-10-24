-- Review fix (ADR 0008): Stripe delivers events out of order. A late event
-- must not undo a newer one, and a cancelled subscription never comes back
-- on (canceled and incomplete_expired are final in Stripe).

-- The one place that says which Stripe statuses keep an Add-on on: past_due
-- stays on while Stripe retries the card; canceled, unpaid and
-- incomplete_expired switch it off. The apps read `active`, never the list.
create function public.add_on_status_is_on(status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select status in ('active', 'trialing', 'past_due');
$$;

alter table public.add_on_subscriptions drop column active;
alter table public.add_on_subscriptions
  add column active boolean not null generated always as (public.add_on_status_is_on(status)) stored,
  -- Stripe's `created` time of the last event applied to this row.
  add column last_event_at timestamptz;

drop function public.apply_stripe_subscription(uuid, public.add_on, text, text, text, timestamptz);

-- Written by the webhook as service_role, with the event's `created` time.
-- For the subscription already stored, an event older than the last one
-- applied is ignored, and so is anything after it reached a final status.
-- For a different subscription of the same Add-on, a status that is off is
-- ignored: the death of an old subscription must not switch off a newer one.
-- Null item id or period end keep the stored values.
create function public.apply_stripe_subscription(
  company uuid,
  add_on public.add_on,
  subscription_id text,
  item_id text,
  status text,
  period_end timestamptz,
  event_created timestamptz
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
  if company is null or subscription_id is null or coalesce(status, '') = '' or event_created is null then
    raise exception 'company, subscription_id, status and event_created are required';
  end if;

  select * into existing
  from public.add_on_subscriptions s
  where s.company_id = company and s.add_on = apply_stripe_subscription.add_on
  for update;

  if found then
    if existing.stripe_subscription_id = subscription_id then
      if existing.status in ('canceled', 'incomplete_expired') then
        return;
      end if;
      if existing.last_event_at is not null and event_created < existing.last_event_at then
        return;
      end if;
    elsif not public.add_on_status_is_on(apply_stripe_subscription.status) then
      return;
    end if;
  end if;

  insert into public.add_on_subscriptions as s
    (company_id, add_on, stripe_subscription_id, stripe_subscription_item_id, status, current_period_end, last_event_at)
  values
    (company, apply_stripe_subscription.add_on, subscription_id, item_id, apply_stripe_subscription.status, period_end, event_created)
  on conflict (company_id, add_on) do update set
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_subscription_item_id = coalesce(excluded.stripe_subscription_item_id, s.stripe_subscription_item_id),
    status = excluded.status,
    current_period_end = coalesce(excluded.current_period_end, s.current_period_end),
    last_event_at = excluded.last_event_at,
    updated_at = now();
end;
$$;

revoke execute on function public.apply_stripe_subscription(uuid, public.add_on, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription(uuid, public.add_on, text, text, text, timestamptz, timestamptz)
  to service_role;
