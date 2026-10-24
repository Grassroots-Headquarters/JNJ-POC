import "@supabase/functions-js/edge-runtime.d.ts";

import {
  isUuid,
  json,
  preflight,
  readJson,
  requireAdmin,
  serviceClient,
  stripeClient,
} from "../_shared/billing.ts";
import { serve } from "../_shared/sentry.ts";

// POST { companyId, email } as a logged-in Admin: sets where Stripe sends the
// Company's receipts (spec story 10). Empty email clears it. Stripe's
// customer is updated first, so the Company row never claims an address
// Stripe does not have; with no Stripe customer yet, the address is used when
// billing-checkout creates one. Without STRIPE_SECRET_KEY (local, CI) only the
// Company row is saved. Email is never a way to log in (ADR 0005).

// Same rule as the companies.billing_email check constraint.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await readJson(req);
  const companyId = body?.companyId;
  const typed = body?.email;
  if (!isUuid(companyId) || typeof typed !== "string") {
    return json({ error: "companyId and email are required" }, 400);
  }
  const email = typed.trim() === "" ? null : typed.trim();
  if (email !== null && !EMAIL.test(email)) {
    return json({ error: "Enter an email address like accounts@example.com" }, 400);
  }

  const caller = await requireAdmin(req, companyId);
  if (caller instanceof Response) return caller;

  const db = serviceClient();
  const { data: company, error } = await db
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);

  const stripe = stripeClient();
  const customerId = company.stripe_customer_id as string | null;
  if (stripe && customerId) {
    // An empty string clears the email on the Stripe customer.
    await stripe.customers.update(customerId, { email: email ?? "" });
  }

  const { error: saveError } = await db.from("companies").update({ billing_email: email }).eq("id", companyId);
  if (saveError) throw new Error(saveError.message);
  return json({ billingEmail: email });
});
