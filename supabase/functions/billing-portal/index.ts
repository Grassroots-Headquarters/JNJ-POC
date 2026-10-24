import "@supabase/functions-js/edge-runtime.d.ts";

import { requireAdmin, stripeClient, stripeUnavailable } from "../_shared/billing.ts";
import { isUuid, json, preflight, readJson, returnUrlFrom } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { serve } from "../_shared/sentry.ts";

// POST { companyId, returnUrl } as a logged-in Admin → { url } of a Stripe
// customer portal session, where the Admin changes the card and reads
// invoices on Stripe's hosted page (spec story 36). 503 without a Stripe key.

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await readJson(req);
  const companyId = body?.companyId;
  const returnUrl = returnUrlFrom(body?.returnUrl);
  if (!isUuid(companyId) || !returnUrl) return json({ error: "companyId and returnUrl are required" }, 400);

  const caller = await requireAdmin(req, companyId);
  if (caller instanceof Response) return caller;

  const stripe = stripeClient();
  if (!stripe) return stripeUnavailable();

  const db = serviceClient();
  const { data: company, error } = await db
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);
  const customerId = company.stripe_customer_id as string | null;
  if (!customerId) {
    return json({ error: "This Company has no card or invoices yet. Switch on an Add-on first." }, 409);
  }

  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  return json({ url: session.url });
});
