import { describe, expect, it } from "vitest";
import { pickCurrentCompany } from "./current-company";
import type { Membership } from "./memberships";

const a: Membership = { companyId: "a", companyName: "JNJ Building", role: "site_team" };
const b: Membership = { companyId: "b", companyName: "Hart Builders", role: "subcontractor" };

describe("pickCurrentCompany", () => {
  it("has nothing to show for a User with no Memberships", () => {
    expect(pickCurrentCompany([], null)).toEqual({ kind: "none" });
  });

  it("skips the chooser when there is a single Membership", () => {
    expect(pickCurrentCompany([a], null)).toEqual({ kind: "chosen", membership: a });
  });

  it("uses the remembered Company when it is still one of the User's Memberships", () => {
    expect(pickCurrentCompany([a, b], "b")).toEqual({ kind: "chosen", membership: b });
  });

  it("asks the User to choose when there are several Memberships and nothing remembered", () => {
    expect(pickCurrentCompany([a, b], null)).toEqual({ kind: "choose" });
  });

  it("asks again when the remembered Company is no longer one of the User's Memberships", () => {
    expect(pickCurrentCompany([a, b], "gone")).toEqual({ kind: "choose" });
  });

  it("ignores a stale remembered Company when only one Membership is left", () => {
    expect(pickCurrentCompany([a], "gone")).toEqual({ kind: "chosen", membership: a });
  });
});
