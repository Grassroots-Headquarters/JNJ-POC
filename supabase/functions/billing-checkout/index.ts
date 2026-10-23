import "@supabase/functions-js/edge-runtime.d.ts";

import {
  isAddOn,
  isUuid,
  json,
  preflight,
  readJson,
  requireAdmin,
  returnUrlFrom,
  serviceClient,
  stripeClient,
  stripeUnavailable,
} from "../_shared/billing.ts";
import { serve } from "../_shared/sentry.ts";

// POST { companyId, addOn, returnUrl } as a logged-in Admin → { url } of a
// Stripe Checkout Session (subscription mode) for the Add-on's monthly price.
// The Company becomes a Stripe customer on first use. Nothing is switched on
// here: the webhook does that once Stripe confirms payment (ADR 0008).
// 503 when STRIPE_SECRET_KEY / STRIPE_CLIENT_PORTAL_PRICE_ID are unset.

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await readJson(req);
  const companyId = body?.companyId;
  const addOn = body?.addOn;
  const returnUrl = returnUrlFrom(body?.returnUrl);
  if (!isUuid(companyId) || !isAddOn(addOn) || !returnUrl) {
    return json({ error: "companyId, addOn and returnUrl are required" }, 400);
  }

  const caller = await requireAdmin(req, companyId);
  if (caller instanceof Response) return caller;

  const stripe = stripeClient();
  const priceId = Deno.env.get("STRIPE_CLIENT_PORTAL_PRICE_ID");
  if (!stripe || !priceId) return stripeUnavailable();

  const db = serviceClient();
  const { data: company, error } = await db
    .from("companies")
    .select("id, name, billing_email, stripe_customer_id")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);

  let customerId = company.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name as string,
      email: (company.billing_email as string | null) ?? undefined,
      metadata: { company_id: companyId },
    });
    customerId = customer.id;
    const { error: saveError } = await db
      .from("companies")
      .update({ stripe_customer_id: customerId })
      .eq("id", companyId)
      .is("stripe_customer_id", null);
    if (saveError) throw new Error(saveError.message);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: companyId,
    metadata: { company_id: companyId, add_on: addOn },
    subscription_data: { metadata: { company_id: companyId, add_on: addOn } },
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe returned a Checkout Session without a url");
  return json({ url: session.url });
});
