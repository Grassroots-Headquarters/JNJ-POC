import {
  COMPANY_A,
  TEST_USERS,
  createServiceClient,
  freeTestPhone,
  functionUrl,
  functionsEnv,
  postFunctionAs,
  signInAs,
} from "@jnj/harness";
import { companyHasAddOn, listAddOns, signUpCompany, startCheckout, type TypedClient } from "@jnj/shared";
import Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";

// Stripe is exercised with test-mode events signed exactly as real ones are
// (spec: Testing Decisions). Only the signing key differs: the local-only
// STRIPE_WEBHOOK_SECRET from supabase/functions/.env. No STRIPE_SECRET_KEY is
// set locally, so Stripe's hosted pages answer 503 and the API calls are
// skipped. Free test numbers for this file: +447700900016 to 019.

const webhookSecret = functionsEnv("STRIPE_WEBHOOK_SECRET");
const stripe = new Stripe("sk_test_signing_only");
const run = Date.now().toString(36);
let eventCounter = 0;

const SUB_A = `sub_a_${run}`;
const ITEM_A = `si_a_${run}`;
const SUB_A2 = `sub_a2_${run}`;
const ITEM_A2 = `si_a2_${run}`;
const SUB_A3 = `sub_a3_${run}`;
const ITEM_A3 = `si_a3_${run}`;
const CUSTOMER_A = `cus_a_${run}`;
const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

type EventOverrides = { id?: string; signature?: string; /** Unix seconds; Stripe's event.created. */ created?: number };

async function sendEvent(type: string, object: Record<string, unknown>, overrides: EventOverrides = {}) {
  const id = overrides.id ?? `evt_${run}_${++eventCounter}`;
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2026-09-30.endive",
    created: overrides.created ?? Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  });
  const signature = overrides.signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const response = await fetch(functionUrl("stripe-webhook"), {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return { id, response, body: (await response.json()) as Record<string, unknown> };
}

function subscription(companyId: string, id: string, status: string, customer: string, item: string) {
  return {
    id,
    object: "subscription",
    customer,
    status,
    metadata: { company_id: companyId, add_on: "client_portal" },
    items: {
      object: "list",
      data: [{ id: item, object: "subscription_item", current_period_end: periodEnd, price: { id: "price_test" } }],
    },
    cancel_at_period_end: false,
  };
}

function checkoutSession(companyId: string, customer: string, subscriptionId: string, paymentStatus = "paid") {
  return {
    id: `cs_${run}_${companyId.slice(-2)}`,
    object: "checkout.session",
    mode: "subscription",
    client_reference_id: companyId,
    customer,
    subscription: subscriptionId,
    payment_status: paymentStatus,
    status: "complete",
    metadata: { company_id: companyId, add_on: "client_portal" },
  };
}

function invoice(companyId: string, customer: string, subscriptionId: string, paid: boolean) {
  return {
    id: `in_${run}_${++eventCounter}`,
    object: "invoice",
    customer,
    status: paid ? "paid" : "open",
    paid,
    parent: {
      type: "subscription_details",
      subscription_details: { subscription: subscriptionId, metadata: { company_id: companyId, add_on: "client_portal" } },
    },
    lines: { object: "list", data: [{ period: { start: periodEnd - 30 * 24 * 3600, end: periodEnd } }] },
  };
}

let alex: TypedClient;
let sam: TypedClient;
let bea: TypedClient;

beforeAll(async () => {
  [alex, sam, bea] = await Promise.all([
    signInAs(TEST_USERS.alexAdmin),
    signInAs(TEST_USERS.samSite),
    signInAs(TEST_USERS.beaBoss),
  ]);
});

describe("the Client Portal Add-on follows Stripe", () => {
  it("switches on for Company A when Stripe confirms a paid subscription", async () => {
    const checkout = await sendEvent(
      "checkout.session.completed",
      checkoutSession(COMPANY_A.id, CUSTOMER_A, SUB_A),
    );
    expect(checkout.response.status).toBe(200);
    const created = await sendEvent(
      "customer.subscription.created",
      subscription(COMPANY_A.id, SUB_A, "active", CUSTOMER_A, ITEM_A),
    );
    expect(created.response.status).toBe(200);
    expect(created.body).toEqual({ received: true });

    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(true);
    const addOns = await listAddOns(sam, COMPANY_A.id);
    expect(addOns).toEqual([
      {
        addOn: "client_portal",
        status: "active",
        active: true,
        currentPeriodEnd: new Date(periodEnd * 1000).toISOString().replace(".000Z", "+00:00"),
      },
    ]);
  });

  it("keeps Company A's Add-on state away from Company B", async () => {
    expect(await listAddOns(bea, COMPANY_A.id)).toEqual([]);
    expect(await companyHasAddOn(bea, COMPANY_A.id, "client_portal")).toBe(false);
    const { error } = await bea
      .from("add_on_subscriptions")
      .insert({ company_id: COMPANY_A.id, add_on: "client_portal", stripe_subscription_id: "sub_forged", status: "active" });
    expect(error?.code).toBe("42501");
  });

  it("stays on while a payment is past due, then switches off when Stripe gives up", async () => {
    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A, "past_due", CUSTOMER_A, ITEM_A));
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(true);

    await sendEvent("invoice.payment_failed", invoice(COMPANY_A.id, CUSTOMER_A, SUB_A, false));
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(true);
    expect((await listAddOns(sam, COMPANY_A.id))[0]?.status).toBe("past_due");

    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A, "unpaid", CUSTOMER_A, ITEM_A));
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(false);

    await sendEvent("customer.subscription.deleted", subscription(COMPANY_A.id, SUB_A, "canceled", CUSTOMER_A, ITEM_A));
    expect((await listAddOns(sam, COMPANY_A.id))[0]).toMatchObject({ status: "canceled", active: false });
  });

  it("rejects a tampered signature and changes nothing", async () => {
    const forged = await sendEvent(
      "customer.subscription.updated",
      subscription(COMPANY_A.id, SUB_A, "active", CUSTOMER_A, ITEM_A),
      { signature: stripe.webhooks.generateTestHeaderString({ payload: "{}", secret: webhookSecret }) },
    );
    expect(forged.response.status).toBe(400);
    expect(forged.body.error).toMatch(/signature/i);

    const unsigned = await fetch(functionUrl("stripe-webhook"), { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(400);

    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(false);
  });

  it("treats a replayed event id as already handled", async () => {
    // A new subscription: the one above was cancelled, and a cancelled Stripe subscription stays cancelled.
    const first = await sendEvent(
      "customer.subscription.updated",
      subscription(COMPANY_A.id, SUB_A2, "active", CUSTOMER_A, ITEM_A2),
    );
    expect(first.body).toEqual({ received: true });
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(true);

    await sendEvent("customer.subscription.deleted", subscription(COMPANY_A.id, SUB_A2, "canceled", CUSTOMER_A, ITEM_A2));
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(false);

    // Stripe redelivers the earlier "active" event: it must not switch the Add-on back on.
    const replay = await sendEvent(
      "customer.subscription.updated",
      subscription(COMPANY_A.id, SUB_A2, "active", CUSTOMER_A, ITEM_A2),
      { id: first.id },
    );
    expect(replay.response.status).toBe(200);
    expect(replay.body).toEqual({ received: true, duplicate: true });
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(false);
  });

  it("ignores events that arrive after a newer one, and never revives a cancelled subscription", async () => {
    const now = Math.floor(Date.now() / 1000);
    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A3, "active", CUSTOMER_A, ITEM_A3), {
      created: now,
    });
    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A3, "past_due", CUSTOMER_A, ITEM_A3), {
      created: now + 20,
    });
    // An "active" update from before the payment failed turns up late.
    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A3, "active", CUSTOMER_A, ITEM_A3), {
      created: now + 10,
    });
    expect((await listAddOns(sam, COMPANY_A.id))[0]).toMatchObject({ status: "past_due", active: true });

    await sendEvent("customer.subscription.deleted", subscription(COMPANY_A.id, SUB_A3, "canceled", CUSTOMER_A, ITEM_A3), {
      created: now + 40,
    });
    // The invoice paid before the cancellation arrives after it.
    const latePaid = await sendEvent("invoice.paid", invoice(COMPANY_A.id, CUSTOMER_A, SUB_A3, true), { created: now + 30 });
    expect(latePaid.response.status).toBe(200);
    expect((await listAddOns(sam, COMPANY_A.id))[0]).toMatchObject({ status: "canceled", active: false });

    // Even an event stamped after the cancellation cannot bring the same subscription back.
    await sendEvent("customer.subscription.updated", subscription(COMPANY_A.id, SUB_A3, "active", CUSTOMER_A, ITEM_A3), {
      created: now + 50,
    });
    expect(await companyHasAddOn(sam, COMPANY_A.id, "client_portal")).toBe(false);
  });
});

describe("the Referral free month", () => {
  it("is granted once when a referred Company first pays for an Add-on", async () => {
    const referred = await signInAs(freeTestPhone(16));
    const companyId = await signUpCompany(referred, {
      companyName: `Referred Builders ${run}`,
      fullName: "Rae Referred",
      referralCode: COMPANY_A.referralCode,
    });
    const customer = `cus_ref_${run}`;
    const subscriptionId = `sub_ref_${run}`;

    await sendEvent("checkout.session.completed", checkoutSession(companyId, customer, subscriptionId));
    await sendEvent("customer.subscription.created", subscription(companyId, subscriptionId, "active", customer, `si_ref_${run}`));
    const paid = await sendEvent("invoice.paid", invoice(companyId, customer, subscriptionId, true));
    expect(paid.response.status).toBe(200);
    expect(await companyHasAddOn(referred, companyId, "client_portal")).toBe(true);

    // The next month's invoice does not grant it again.
    await sendEvent("invoice.paid", invoice(companyId, customer, subscriptionId, true));

    const service = createServiceClient();
    const { data: rewards } = await service
      .from("referral_rewards")
      .select("referred_company_id, referring_company_id, referred_subscription_id, coupon")
      .eq("referred_company_id", companyId);
    expect(rewards).toEqual([
      {
        referred_company_id: companyId,
        referring_company_id: COMPANY_A.id,
        referred_subscription_id: subscriptionId,
        coupon: "referral-free-month",
      },
    ]);

    // The reward is nobody's business through the API.
    const { data: visible } = await referred.from("referral_rewards").select("coupon");
    expect(visible).toEqual([]);
  });
});

describe("Stripe's hosted pages are for Admins only", () => {
  const returnUrl = "http://localhost:3000/billing";

  it("refuses a Site team member", async () => {
    const checkout = await postFunctionAs(sam, "billing-checkout", { companyId: COMPANY_A.id, addOn: "client_portal", returnUrl });
    expect(checkout.status).toBe(403);
    expect(await checkout.json()).toEqual({ error: "Only Admins can manage billing" });

    const portal = await postFunctionAs(sam, "billing-portal", { companyId: COMPANY_A.id, returnUrl });
    expect(portal.status).toBe(403);
  });

  it("refuses an Admin of another Company", async () => {
    const checkout = await postFunctionAs(bea, "billing-checkout", { companyId: COMPANY_A.id, addOn: "client_portal", returnUrl });
    expect(checkout.status).toBe(403);
  });

  it("tells an Admin plainly when Stripe is not set up on this environment", async () => {
    const checkout = await postFunctionAs(alex, "billing-checkout", { companyId: COMPANY_A.id, addOn: "client_portal", returnUrl });
    expect(checkout.status).toBe(503);
    const portal = await postFunctionAs(alex, "billing-portal", { companyId: COMPANY_A.id, returnUrl });
    expect(portal.status).toBe(503);

    await expect(startCheckout(alex, { companyId: COMPANY_A.id, addOn: "client_portal", returnUrl })).rejects.toThrow(
      /Stripe is not set up/,
    );
  });

  it("rejects a malformed request before anything else", async () => {
    const response = await postFunctionAs(alex, "billing-checkout", { companyId: "not-a-uuid", addOn: "client_portal", returnUrl });
    expect(response.status).toBe(400);
  });
});
