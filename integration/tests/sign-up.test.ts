import { COMPANY_A, freeTestPhone, signInAs } from "@jnj/harness";
import { listMyMemberships, signUpCompany } from "@jnj/shared";
import { describe, expect, it } from "vitest";

// Free test numbers: Playwright uses 06; these tests use 07 and 08.
describe("Company sign-up", () => {
  it("makes the caller the first Admin of the new Company and records the Referral code", async () => {
    const client = await signInAs(freeTestPhone(7));
    const companyId = await signUpCompany(client, {
      companyName: "Vitest Builders",
      fullName: "Vic Vitest",
      referralCode: COMPANY_A.referralCode.toLowerCase(),
    });

    const memberships = await listMyMemberships(client);
    expect(memberships).toContainEqual({ companyId, companyName: "Vitest Builders", role: "admin" });

    const { data: company } = await client
      .from("companies")
      .select("name, referral_code, referred_by_company_id")
      .eq("id", companyId)
      .single();
    expect(company?.referred_by_company_id).toBe(COMPANY_A.id);
    expect(company?.referral_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const { data: profile } = await client.from("profiles").select("full_name").single();
    expect(profile?.full_name).toBe("Vic Vitest");
  });

  it("rejects an unknown Referral code without creating anything", async () => {
    const client = await signInAs(freeTestPhone(8));
    await expect(
      signUpCompany(client, { companyName: "Nope Ltd", fullName: "Nora", referralCode: "ZZZZZZ" }),
    ).rejects.toThrow("Unknown Referral code");
    expect(await listMyMemberships(client)).toEqual([]);
  });
});
