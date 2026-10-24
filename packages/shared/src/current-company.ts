import type { Membership } from "./memberships";

export type CurrentCompanyChoice =
  | { kind: "none" }
  | { kind: "chosen"; membership: Membership }
  | { kind: "choose" };

/**
 * Which Company the app should work in. A single Membership is used without
 * asking; several Memberships use the remembered choice when it is still
 * valid and otherwise send the User to the Company chooser.
 */
export function pickCurrentCompany(memberships: Membership[], rememberedId: string | null): CurrentCompanyChoice {
  if (memberships.length === 0) return { kind: "none" };
  if (memberships.length === 1) return { kind: "chosen", membership: memberships[0] };
  const remembered = memberships.find((m) => m.companyId === rememberedId);
  if (remembered) return { kind: "chosen", membership: remembered };
  return { kind: "choose" };
}
