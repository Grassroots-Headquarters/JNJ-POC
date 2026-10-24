import { COMPANY_A, COMPANY_B, TEST_USERS, signInAs } from "@mba/harness";
import { listMyMemberships } from "@mba/shared";
import { describe, expect, it } from "vitest";

describe("Membership visibility across Companies", () => {
  it("shows an Admin of Company B only Company B", async () => {
    const bea = await signInAs(TEST_USERS.beaBoss);
    expect(await listMyMemberships(bea)).toEqual([
      { companyId: COMPANY_B.id, companyName: COMPANY_B.name, role: "admin" },
    ]);
    const { data: companies } = await bea.from("companies").select("id");
    expect(companies).toEqual([{ id: COMPANY_B.id }]);
  });

  it("shows a User in both Companies both, with the right Role in each", async () => {
    const dee = await signInAs(TEST_USERS.deeDual);
    expect(await listMyMemberships(dee)).toEqual([
      { companyId: COMPANY_A.id, companyName: COMPANY_A.name, role: "site_team" },
      { companyId: COMPANY_B.id, companyName: COMPANY_B.name, role: "subcontractor" },
    ]);
  });

  it("keeps Company A's people away from Company B", async () => {
    const bea = await signInAs(TEST_USERS.beaBoss);
    const { data: memberships } = await bea.from("memberships").select("user_id").eq("company_id", COMPANY_A.id);
    expect(memberships).toEqual([]);
    const { data: users } = await bea.from("profiles").select("full_name");
    expect(users?.map((p) => p.full_name).sort()).toEqual(["Bea Boss", "Dee Dual"]);
  });

  it("stops a Company B Admin adding themselves to Company A", async () => {
    const bea = await signInAs(TEST_USERS.beaBoss);
    const { data: me } = await bea.auth.getUser();
    const { error } = await bea
      .from("memberships")
      .insert({ user_id: me.user!.id, company_id: COMPANY_A.id, role: "admin" });
    expect(error?.code).toBe("42501");
  });
});
