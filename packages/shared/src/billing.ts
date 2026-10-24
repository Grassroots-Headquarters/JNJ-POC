import type { TypedClient } from "./client";
import type { Enums } from "./database.types";

export type AddOn = Enums<"add_on">;

export const addOnLabel: Record<AddOn, string> = {
  client_portal: "Client Portal",
};

/** A Company's Add-on as Stripe last reported it (ADR 0008). */
export type AddOnState = {
  addOn: AddOn;
  /** Stripe's subscription status: active, trialing, past_due, canceled, unpaid, ... */
  status: string;
  /** Whether the Add-on is on. past_due stays on while Stripe retries the card. */
  active: boolean;
  /** ISO timestamp of the end of the paid period, when Stripe sent one. */
  currentPeriodEnd: string | null;
};

/** The Company's Add-ons, as RLS lets the caller see them (Members only). */
export async function listAddOns(client: TypedClient, companyId: string): Promise<AddOnState[]> {
  const { data, error } = await client
    .from("add_on_subscriptions")
    .select("add_on, status, active, current_period_end")
    .eq("company_id", companyId)
    .order("add_on");
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    addOn: row.add_on,
    status: row.status,
    active: row.active,
    currentPeriodEnd: row.current_period_end,
  }));
}

/** Is this Add-on on for the Company? False for anyone who is not a Member. */
export async function companyHasAddOn(client: TypedClient, companyId: string, addOn: AddOn): Promise<boolean> {
  const { data, error } = await client.rpc("company_has_add_on", { company: companyId, add_on: addOn });
  if (error) throw new Error(error.message);
  return data === true;
}

export type AddOnSummary = {
  on: boolean;
  label: "On" | "Off";
  /** One line for the Admin: what happens next, in plain words. Never a price. */
  detail: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Words for an Add-on's state on the Billing page. `state` is undefined when Stripe has never reported it. */
export function summariseAddOn(state: AddOnState | undefined): AddOnSummary {
  if (!state) return { on: false, label: "Off", detail: "Not switched on." };
  const periodEnd = state.currentPeriodEnd ? dateFormat.format(new Date(state.currentPeriodEnd)) : null;
  if (!state.active) {
    return { on: false, label: "Off", detail: "Switched off. Payment stopped or the subscription was cancelled." };
  }
  switch (state.status) {
    case "trialing":
      return { on: true, label: "On", detail: periodEnd ? `Trial ends on ${periodEnd}.` : "On trial." };
    case "past_due":
      return {
        on: true,
        label: "On",
        detail: "The last payment failed. Stripe is retrying your card; the Add-on switches off if it is not recovered.",
      };
    default:
      return { on: true, label: "On", detail: periodEnd ? `Next renewal on ${periodEnd}.` : "Paid and on." };
  }
}

export type CheckoutInput = { companyId: string; addOn: AddOn; returnUrl: string };

/** Ask the billing-checkout Edge Function for a Stripe Checkout URL. Admins only. */
export async function startCheckout(client: TypedClient, input: CheckoutInput): Promise<string> {
  return await functionUrl(client, "billing-checkout", input);
}

/** Ask the billing-portal Edge Function for a Stripe customer portal URL. Admins only. */
export async function openBillingPortal(client: TypedClient, input: { companyId: string; returnUrl: string }): Promise<string> {
  return await functionUrl(client, "billing-portal", input);
}

async function functionUrl(client: TypedClient, name: string, body: object): Promise<string> {
  const { data, error } = await client.functions.invoke<{ url?: string; error?: string }>(name, { body });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.url) throw new Error(data?.error ?? "No URL came back from Stripe.");
  return data.url;
}

/** The Edge Function's own `error` message when it answered with a non-2xx, else the SDK's. */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // not JSON
    }
  }
  return error instanceof Error ? error.message : "Something went wrong talking to billing.";
}

/**
 * Where Stripe sends receipts for this Company; empty clears it. Goes through
 * the billing-email Edge Function so the Stripe customer changes too. Admins only.
 */
export async function setBillingEmail(client: TypedClient, companyId: string, email: string): Promise<void> {
  const { error } = await client.functions.invoke("billing-email", { body: { companyId, email } });
  if (error) throw new Error(await functionErrorMessage(error));
}

export type CompanyBilling = {
  name: string;
  billingEmail: string | null;
  hasStripeCustomer: boolean;
};

export async function getCompanyBilling(client: TypedClient, companyId: string): Promise<CompanyBilling> {
  const { data, error } = await client
    .from("companies")
    .select("name, billing_email, stripe_customer_id")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);
  return {
    name: data.name,
    billingEmail: data.billing_email,
    hasStripeCustomer: data.stripe_customer_id !== null,
  };
}
