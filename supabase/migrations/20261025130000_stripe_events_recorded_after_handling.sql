-- Review fix: the webhook now records an event id only after handling it, so
-- a failure is retried by Stripe instead of being answered as a duplicate.
comment on table public.stripe_events is
  'Stripe event ids the stripe-webhook function has handled, recorded after success so a failed event is retried. Service role only.';
