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
  const userId = await loggedInUserId(client);
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

/** The logged-in User's own details (stored in the `profiles` table). */
export type MyUser = {
  userId: string;
  fullName: string;
};

/** The logged-in User's own details. */
export async function getMyUser(client: TypedClient): Promise<MyUser> {
  const userId = await loggedInUserId(client);
  const { data, error } = await client
    .from("profiles")
    .select("user_id, full_name")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return { userId: data.user_id, fullName: data.full_name };
}

async function loggedInUserId(client: TypedClient): Promise<string> {
  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not logged in");
  return userId;
}
