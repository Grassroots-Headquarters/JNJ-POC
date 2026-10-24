import type { TypedClient } from "./client";
import type { Role } from "./memberships";

/** One person in a Company, as the Team screen lists them. */
export type Member = {
  userId: string;
  fullName: string;
  role: Role;
  /** A Subcontractor's trade; null for everyone else. */
  trade: string | null;
};

/** The Company's Members, oldest first. RLS limits them to the caller's own Companies. */
export async function listMembers(client: TypedClient, companyId: string): Promise<Member[]> {
  const { data, error } = await client
    .from("memberships")
    .select("user_id, role, trade, profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    userId: row.user_id,
    fullName: row.profiles.full_name,
    role: row.role,
    trade: row.trade,
  }));
}

/** Changes a Member's Role (Admins only). Applies on their next query. */
export async function changeMemberRole(
  client: TypedClient,
  input: { companyId: string; userId: string; role: Role },
): Promise<void> {
  const { error } = await client.rpc("change_member_role", {
    company: input.companyId,
    user_id: input.userId,
    role: input.role,
  });
  if (error) throw new Error(error.message);
}

/** Removes a Membership (Admins only). Access ends on their next query. */
export async function removeMember(client: TypedClient, input: { companyId: string; userId: string }): Promise<void> {
  const { error } = await client.rpc("remove_member", { company: input.companyId, user_id: input.userId });
  if (error) throw new Error(error.message);
}
