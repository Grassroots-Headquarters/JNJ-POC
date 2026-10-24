import { describe, expect, it } from "vitest";
import { companyHasAddOn, functionErrorMessage, summariseAddOn, type AddOnState } from "./billing";
import type { TypedClient } from "./client";

const periodEnd = "2026-11-23T10:00:00.000Z";
const state = (status: string, active: boolean, currentPeriodEnd: string | null = periodEnd): AddOnState => ({
  addOn: "client_portal",
  status,
  active,
  currentPeriodEnd,
});

describe("summariseAddOn", () => {
  it("is Off before Stripe has ever reported the Add-on", () => {
    expect(summariseAddOn(undefined)).toEqual({ on: false, label: "Off", detail: "Not switched on." });
  });

  it("is On with the renewal date once Stripe says the subscription is active", () => {
    expect(summariseAddOn(state("active", true))).toEqual({ on: true, label: "On", detail: "Next renewal on 23 Nov 2026." });
  });

  it("stays On while Stripe retries a failed payment, and says so", () => {
    const summary = summariseAddOn(state("past_due", true));
    expect(summary.on).toBe(true);
    expect(summary.detail).toMatch(/payment failed/i);
  });

  it("is Off once the subscription is cancelled or unpaid", () => {
    expect(summariseAddOn(state("canceled", false)).label).toBe("Off");
    expect(summariseAddOn(state("unpaid", false)).on).toBe(false);
  });

  it("names the trial end for a trial", () => {
    expect(summariseAddOn(state("trialing", true)).detail).toBe("Trial ends on 23 Nov 2026.");
  });

  it("never mentions a price", () => {
    for (const s of [undefined, state("active", true), state("past_due", true), state("canceled", false)]) {
      expect(summariseAddOn(s).detail).not.toMatch(/£|\$|\d+\.\d\d|per month/);
    }
  });
});

describe("companyHasAddOn", () => {
  it("asks the database function for the Company and Add-on", async () => {
    const calls: unknown[] = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push([name, args]);
        return { data: true, error: null };
      },
    } as unknown as TypedClient;
    expect(await companyHasAddOn(client, "company-a", "client_portal")).toBe(true);
    expect(calls).toEqual([["company_has_add_on", { company: "company-a", add_on: "client_portal" }]]);
  });

  it("treats anything but true as off", async () => {
    const client = { rpc: async () => ({ data: null, error: null }) } as unknown as TypedClient;
    expect(await companyHasAddOn(client, "company-a", "client_portal")).toBe(false);
  });
});

describe("functionErrorMessage", () => {
  it("prefers the Edge Function's own error message", async () => {
    const context = Response.json({ error: "Only Admins can manage billing" }, { status: 403 });
    expect(await functionErrorMessage({ message: "Edge Function returned a non-2xx status code", context })).toBe(
      "Only Admins can manage billing",
    );
  });

  it("falls back to the SDK error when there is no body", async () => {
    expect(await functionErrorMessage(new Error("Failed to send a request to the Edge Function"))).toBe(
      "Failed to send a request to the Edge Function",
    );
  });
});
