// Shared pieces of the billing Edge Functions (ADR 0008): JSON responses with
// CORS for the Admin app, the service-role client the webhook writes with,
// the "is the caller an Admin of this Company" check, and the Stripe client,
// which is absent locally and in CI (no STRIPE_SECRET_KEY) so those paths
// answer 503 rather than fake Stripe's hosted pages.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@23.0.1";

/** The fixed coupon id the account wizard creates in test and live mode. */
export const REFERRAL_COUPON = "referral-free-month";

export const ADD_ONS = ["client_portal"] as const;
export type AddOn = (typeof ADD_ONS)[number];

export function isAddOn(value: unknown): value is AddOn {
  return typeof value === "string" && (ADD_ONS as readonly string[]).includes(value);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Bypasses RLS: only for the writes that must happen whatever the caller. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client acting as the caller, so RLS and is_admin decide what they may do. */
function callerClient(authorization: string): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** An absolute http(s) URL the Admin app sent to come back to, without its query string. */
export function returnUrlFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type { Stripe };
