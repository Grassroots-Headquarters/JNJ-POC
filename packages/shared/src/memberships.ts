import type { TypedClient } from "./client";
import type { Enums } from "./database.types";

export type Role = Enums<"role">;

/** One of the current User's Memberships, with the Company it belongs to. */
export type Membership = {
  companyId: string;
  companyName: string;
  role: Role;
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  site_team: "Site team",
  subcontractor: "Subcontractor",
};

/**
 * The current User's own Memberships, oldest first. RLS already limits the
 * rows to Companies the caller belongs to; the user_id filter drops the
 * other Members of those Companies.
 */
export async function listMyMemberships(client: TypedClient): Promise<Membership[]> {
  const { data: session } = await client.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Not logged in");
  const { data, error } = await client
    .from("memberships")
    .select("company_id, role, companies(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    companyId: row.company_id,
    companyName: row.companies.name,
    role: row.role,
  }));
}

export type SignUpCompanyInput = {
  companyName: string;
  fullName: string;
  referralCode?: string | null;
};

/** Creates the Company and makes the caller its first Admin. Returns the Company id. */
export async function signUpCompany(client: TypedClient, input: SignUpCompanyInput): Promise<string> {
  const referralCode = input.referralCode?.trim();
  const { data, error } = await client.rpc("sign_up_company", {
    company_name: input.companyName,
    full_name: input.fullName,
    referral_code: referralCode ? referralCode : undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

export type Profile = {
  userId: string;
  fullName: string;
  billingEmail: string | null;
};

/** The logged-in User's own profile. */
export async function getMyProfile(client: TypedClient): Promise<Profile> {
  const { data: session } = await client.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Not logged in");
  const { data, error } = await client
    .from("profiles")
    .select("user_id, full_name, billing_email")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return { userId: data.user_id, fullName: data.full_name, billingEmail: data.billing_email };
}
