import "@supabase/functions-js/edge-runtime.d.ts";

import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { REFERRAL_COUPON, isAddOn, stripeClient, type AddOn } from "../_shared/billing.ts";
import { isUuid, json } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { Sentry, serve } from "../_shared/sentry.ts";

// The only thing that switches an Add-on on or off (ADR 0008). Stripe posts
// signed events here (`verify_jwt = false`; the signature is the check).
// Events can repeat and arrive out of order, so every handled event id is
// recorded and apply_stripe_subscription is given the event's `created` time: it
// ignores events older than the last one applied and never revives a
// cancelled subscription.
//
// Subscribed events (set by the account wizard): checkout.session.completed,
// customer.subscription.created|updated|deleted, invoice.paid,
// invoice.payment_failed.

const cryptoProvider = Stripe.createSubtleCryptoProvider();
// Signature checking needs no API key; the placeholder keeps the SDK happy locally.
const webhooks = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_unset").webhooks;

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, 500);

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature) return json({ error: "missing stripe-signature header" }, 400);

  let event: Stripe.Event;
  try {
    event = await webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: `invalid signature: ${message}` }, 400);
  }

  const db = serviceClient();
  const { data: seen, error: seenError } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seenError) throw new Error(`could not check event ${event.id}: ${seenError.message}`);
  if (seen) return json({ received: true, duplicate: true });

  // Recorded only once handled: if handling throws, Stripe's retry runs it
  // again. Two deliveries racing both get handled, which is safe because
  // apply_stripe_subscription orders events and the Referral reward is
  // granted once per Company.
  const outcome = await handle(event, db);
  const { error: recordError } = await db
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  if (recordError) throw new Error(`could not record event ${event.id}: ${recordError.message}`);
  return json({ received: true, ...outcome });
});

type Outcome = { ignored?: string };

async function handle(event: Stripe.Event, db: SupabaseClient): Promise<Outcome> {
  const at = isoFrom(event.created)!;
  switch (event.type) {
    case "checkout.session.completed":
      return await onCheckoutCompleted(event.data.object, at, db);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return await onSubscription(event.data.object, event.data.object.status, at, db);
    case "customer.subscription.deleted":
      return await onSubscription(event.data.object, "canceled", at, db);
    case "invoice.paid":
      return await onInvoicePaid(event.data.object, at, db);
    case "invoice.payment_failed":
      return await onInvoicePaymentFailed(event.data.object, at, db);
    default:
      return { ignored: `unhandled event type ${event.type}` };
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session, at: string, db: SupabaseClient): Promise<Outcome> {
  const customerId = idOf(session.customer);
  const companyId = await companyIdFor(db, {
    metadataCompanyId: session.metadata?.company_id,
    clientReferenceId: session.client_reference_id,
    customerId,
  });
  if (!companyId) return { ignored: "no Company for this checkout session" };
  await linkCustomer(db, companyId, customerId);

  const subscriptionId = idOf(session.subscription);
  // Switch on only once Stripe says the first payment is in; the subscription
  // events that follow carry the item id and period end.
  if (session.mode === "subscription" && subscriptionId && session.payment_status === "paid") {
    await apply(db, { companyId, addOn: addOnOf(session.metadata), subscriptionId, status: "active", at });
  }
  return {};
}

async function onSubscription(
  subscription: Stripe.Subscription,
  status: string,
  at: string,
  db: SupabaseClient,
): Promise<Outcome> {
  const customerId = idOf(subscription.customer);
  const companyId = await companyIdFor(db, { metadataCompanyId: subscription.metadata?.company_id, customerId });
  if (!companyId) return { ignored: "no Company for this subscription" };
  await linkCustomer(db, companyId, customerId);

  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? (subscription as { current_period_end?: number }).current_period_end;
  await apply(db, {
    companyId,
    addOn: addOnOf(subscription.metadata),
    subscriptionId: subscription.id,
    itemId: item?.id,
    status,
    periodEnd: isoFrom(periodEnd),
    at,
  });
  return {};
}

async function onInvoicePaid(invoice: Stripe.Invoice, at: string, db: SupabaseClient): Promise<Outcome> {
  const { subscriptionId, metadata, customerId } = invoiceSubscription(invoice);
  if (!subscriptionId) return { ignored: "invoice is not for a subscription" };
  const companyId = await companyIdFor(db, { metadataCompanyId: metadata.company_id, customerId });
  if (!companyId) return { ignored: "no Company for this invoice" };
  await linkCustomer(db, companyId, customerId);

  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  await apply(db, { companyId, addOn: addOnOf(metadata), subscriptionId, status: "active", periodEnd: isoFrom(periodEnd), at });
  await grantReferralReward(db, companyId, subscriptionId);
  return {};
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice, at: string, db: SupabaseClient): Promise<Outcome> {
  const { subscriptionId, metadata, customerId } = invoiceSubscription(invoice);
  if (!subscriptionId) return { ignored: "invoice is not for a subscription" };
  const companyId = await companyIdFor(db, { metadataCompanyId: metadata.company_id, customerId });
  if (!companyId) return { ignored: "no Company for this invoice" };

  // Stripe retries the card for a while: the Add-on stays on as past_due and
  // the subscription events decide the end (canceled / unpaid). A failure for a
  // subscription that is already off, or never got on, changes nothing.
  const addOn = addOnOf(metadata);
  const { data: current, error } = await db
    .from("add_on_subscriptions")
    .select("stripe_subscription_id, active")
    .eq("company_id", companyId)
    .eq("add_on", addOn)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current || current.stripe_subscription_id !== subscriptionId || !current.active) {
    return { ignored: "payment failure for a subscription that is not on" };
  }
  await apply(db, { companyId, addOn, subscriptionId, status: "past_due", at });
  return {};
}

/**
 * The Referral free month (spec story 39): when a referred Company first pays
 * for an Add-on, both Companies' subscriptions get the coupon. Recorded once
 * per referred Company; applied through the Stripe API when a key is set.
 */
async function grantReferralReward(db: SupabaseClient, companyId: string, subscriptionId: string): Promise<void> {
  const { data: company, error } = await db
    .from("companies")
    .select("referred_by_company_id")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);
  const referringId = company.referred_by_company_id as string | null;
  if (!referringId) return;

  const { data: referringSub } = await db
    .from("add_on_subscriptions")
    .select("stripe_subscription_id")
    .eq("company_id", referringId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const referringSubscriptionId = (referringSub?.stripe_subscription_id as string | undefined) ?? null;

  const { error: insertError } = await db.from("referral_rewards").insert({
    referred_company_id: companyId,
    referring_company_id: referringId,
    referred_subscription_id: subscriptionId,
    referring_subscription_id: referringSubscriptionId,
    coupon: REFERRAL_COUPON,
  });
  if (insertError) {
    if (insertError.code === "23505") return; // already granted
    throw new Error(insertError.message);
  }

  const stripe = stripeClient();
  if (!stripe) return;
  try {
    await stripe.subscriptions.update(subscriptionId, { discounts: [{ coupon: REFERRAL_COUPON }] });
    if (referringSubscriptionId) {
      await stripe.subscriptions.update(referringSubscriptionId, { discounts: [{ coupon: REFERRAL_COUPON }] });
    } else {
      // The referring Company has no subscription yet: the coupon waits on its
      // customer and applies to the first one it starts.
      const { data: referring } = await db
        .from("companies")
        .select("stripe_customer_id")
        .eq("id", referringId)
        .single();
      if (referring?.stripe_customer_id) {
        await stripe.customers.update(referring.stripe_customer_id as string, { coupon: REFERRAL_COUPON });
      }
    }
  } catch (stripeError) {
    // The reward is recorded; a failed coupon call is for a person to fix in Stripe.
    Sentry.captureException(stripeError);
    console.error("referral coupon could not be applied", stripeError);
  }
}

type SubscriptionChange = {
  companyId: string;
  addOn: AddOn;
  subscriptionId: string;
  /** Omitted: keep the stored one. */
  itemId?: string | null;
  status: string;
  /** Omitted: keep the stored one. */
  periodEnd?: string | null;
  /** The event's `created` time; older events than the last applied are ignored. */
  at: string;
};

async function apply(db: SupabaseClient, change: SubscriptionChange): Promise<void> {
  const { error } = await db.rpc("apply_stripe_subscription", {
    company: change.companyId,
    add_on: change.addOn,
    subscription_id: change.subscriptionId,
    item_id: change.itemId ?? null,
    status: change.status,
    period_end: change.periodEnd ?? null,
    event_created: change.at,
  });
  if (error) throw new Error(`apply_stripe_subscription failed: ${error.message}`);
}

/** Which Company an event is about: its metadata, the checkout reference, or the Stripe customer. */
async function companyIdFor(
  db: SupabaseClient,
  ids: { metadataCompanyId?: string | null; clientReferenceId?: string | null; customerId: string | null },
): Promise<string | null> {
  if (isUuid(ids.metadataCompanyId)) return ids.metadataCompanyId;
  if (isUuid(ids.clientReferenceId)) return ids.clientReferenceId;
  if (!ids.customerId) return null;
  const { data, error } = await db.from("companies").select("id").eq("stripe_customer_id", ids.customerId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.id as string | undefined) ?? null;
}

/** Remember the Stripe customer the first time it is seen for a Company. */
async function linkCustomer(db: SupabaseClient, companyId: string, customerId: string | null): Promise<void> {
  if (!customerId) return;
  const { error } = await db
    .from("companies")
    .update({ stripe_customer_id: customerId })
    .eq("id", companyId)
    .is("stripe_customer_id", null);
  if (error && error.code !== "23505") throw new Error(error.message);
}

function invoiceSubscription(invoice: Stripe.Invoice): {
  subscriptionId: string | null;
  metadata: Record<string, string>;
  customerId: string | null;
} {
  // Current API: invoice.parent.subscription_details; older shapes put the
  // subscription id and metadata on the invoice itself.
  const details = invoice.parent?.subscription_details ?? null;
  const legacy = invoice as unknown as {
    subscription?: string | { id: string } | null;
    subscription_details?: { metadata?: Record<string, string> | null } | null;
  };
  return {
    subscriptionId: idOf(details?.subscription ?? legacy.subscription ?? null),
    metadata: details?.metadata ?? legacy.subscription_details?.metadata ?? {},
    customerId: idOf(invoice.customer),
  };
}

function addOnOf(metadata: Record<string, string> | null | undefined): AddOn {
  const value = metadata?.add_on;
  return isAddOn(value) ? value : "client_portal";
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isoFrom(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}
