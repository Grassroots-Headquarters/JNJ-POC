// Shared pieces of the billing Edge Functions (ADR 0008): the Add-ons, the
// "is the caller an Admin of this Company" check, and the Stripe client,
// which is absent locally and in CI (no STRIPE_SECRET_KEY) so those paths
// answer 503 rather than fake Stripe's hosted pages.
import Stripe from "npm:stripe@23.0.1";
import { Constants } from "../../../packages/shared/src/database.types.ts";
import { json } from "./http.ts";
import { callerClient } from "./supabase.ts";

/** The fixed coupon id the account wizard creates in test and live mode. */
export const REFERRAL_COUPON = "referral-free-month";

/** The public.add_on enum, from the generated database types. */
export const ADD_ONS = Constants.public.Enums.add_on;
export type AddOn = (typeof ADD_ONS)[number];

export function isAddOn(value: unknown): value is AddOn {
  return typeof value === "string" && (ADD_ONS as readonly string[]).includes(value);
}

/**
 * Only Admins manage billing. Returns the caller's id, or the response to
 * send back (401 without a login, 403 for a Member who is not an Admin).
 */
export async function requireAdmin(req: Request, companyId: string): Promise<{ userId: string } | Response> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "You must be logged in" }, 401);
  const caller = callerClient(authorization);
  const { data: userData, error: userError } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (userError || !userData.user) return json({ error: "You must be logged in" }, 401);
  const { data: isAdmin, error } = await caller.rpc("is_admin", { company: companyId });
  if (error) throw new Error(`is_admin failed: ${error.message}`);
  if (!isAdmin) return json({ error: "Only Admins can manage billing" }, 403);
  return { userId: userData.user.id };
}

/** Null when STRIPE_SECRET_KEY is unset (local and CI). */
export function stripeClient(): Stripe | null {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key);
}

export function stripeUnavailable(): Response {
  return json(
    { error: "Stripe is not set up on this environment, so billing pages cannot be opened here." },
    503,
  );
}

export type { Stripe };
