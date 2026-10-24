import type { TypedClient } from "./client";
import type { Tables } from "./database.types";
import type { Role } from "./memberships";

export type InviteStatus = "pending" | "accepted" | "cancelled" | "expired";

/** An Invite as the Team screen shows it. */
export type Invite = {
  id: string;
  companyId: string;
  /** E.164. */
  phone: string;
  role: Role;
  fullName: string | null;
  code: string;
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  status: InviteStatus;
  /** The Job the invitee is put on when they accept, if any. */
  jobId: string | null;
};

/** What anyone can see of an Invite from its code alone, before accepting. */
export type InvitePreview = {
  companyName: string;
  role: Role;
  status: InviteStatus;
  /** Only present for the logged-in User the Invite was sent to. */
  invitedName: string | null;
};

type InviteTimestamps = Pick<Tables<"invites">, "accepted_at" | "cancelled_at" | "expires_at">;

/** pending | accepted | cancelled | expired, from the Invite's timestamps. */
export function inviteStatus(invite: InviteTimestamps, now: Date = new Date()): InviteStatus {
  if (invite.accepted_at) return "accepted";
  if (invite.cancelled_at) return "cancelled";
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return "expired";
  return "pending";
}

export const inviteStatusLabel: Record<InviteStatus, string> = {
  pending: "Invite sent",
  accepted: "Accepted",
  cancelled: "Cancelled",
  expired: "Expired",
};

/** The link carried by the Invite SMS; the Admin app serves it as the fallback page. */
export function inviteLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}/invite/${code}`;
}

/** The Invite code inside an SMS body, or null when there is no Invite link in it. */
export function inviteCodeFromSms(body: string): string | null {
  return /\/invite\/([A-HJ-NP-Z2-9]{12})\b/.exec(body)?.[1] ?? null;
}

function toInvite(row: Tables<"invites">): Invite {
  return {
    id: row.id,
    companyId: row.company_id,
    phone: row.phone,
    role: row.role,
    fullName: row.full_name,
    code: row.code,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    status: inviteStatus(row),
    jobId: row.job_id,
  };
}

/** The Company's Invites, newest first. RLS limits them to the Company's Admins. */
export async function listInvites(client: TypedClient, companyId: string): Promise<Invite[]> {
  const { data, error } = await client
    .from("invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(toInvite);
}

export type CreateInviteInput = {
  companyId: string;
  /** As typed; the database normalises it to E.164. */
  phone: string;
  role: Role;
  fullName?: string | null;
  /** Put the invitee on this Job of the Company when they accept. */
  jobId?: string | null;
};

/** Creates the Invite row (Admins only). Call `sendInvite` next to text it. */
export async function createInvite(client: TypedClient, input: CreateInviteInput): Promise<Invite> {
  const fullName = input.fullName?.trim();
  const { data, error } = await client.rpc("create_invite", {
    company: input.companyId,
    phone: input.phone,
    role: input.role,
    full_name: fullName ? fullName : undefined,
    job: input.jobId ?? undefined,
  });
  if (error) throw new Error(error.message);
  return toInvite(data);
}

export class SendInviteError extends Error {
  constructor(
    message: string,
    public readonly status: number | undefined,
  ) {
    super(message);
    this.name = "SendInviteError";
  }
}

/**
 * Asks the send-invite Edge Function to text the Invite as the logged-in
 * Admin. Throws `SendInviteError` with the HTTP status when the function
 * refuses (403 when the caller is not an Admin of the Invite's Company).
 */
export async function sendInvite(client: TypedClient, inviteId: string): Promise<void> {
  const { error } = await client.functions.invoke("send-invite", { body: { inviteId } });
  if (!error) return;
  const response = (error as { context?: Response }).context;
  let message = error.message;
  try {
    const body = (await response?.json()) as { error?: string } | undefined;
    if (body?.error) message = body.error;
  } catch {
    // Not a JSON body; keep the client's message.
  }
  throw new SendInviteError(message, response?.status);
}

/** Cancels a pending Invite (Admins only). */
export async function cancelInvite(client: TypedClient, inviteId: string): Promise<void> {
  const { error } = await client.rpc("cancel_invite", { invite: inviteId });
  if (error) throw new Error(error.message);
}

/** Gives an Invite a fresh code and expiry (Admins only). Call `sendInvite` next. */
export async function resendInvite(client: TypedClient, inviteId: string): Promise<Invite> {
  const { data, error } = await client.rpc("resend_invite", { invite: inviteId });
  if (error) throw new Error(error.message);
  return toInvite(data);
}

/** The Company, Role and status behind an Invite code; null when the code is unknown. */
export async function previewInvite(client: TypedClient, code: string): Promise<InvitePreview | null> {
  const { data, error } = await client.rpc("invite_preview", { code });
  if (error) throw new Error(error.message);
  const row = data[0];
  if (!row) return null;
  return {
    companyName: row.company_name,
    role: row.role,
    status: row.status as InviteStatus,
    invitedName: row.invited_name,
  };
}

export type AcceptInviteInput = {
  code: string;
  fullName: string;
  /** Only meaningful when the Invite's Role is Subcontractor. */
  trade?: string | null;
};

/** Accepts the Invite as the logged-in User. Returns the Company joined. */
export async function acceptInvite(client: TypedClient, input: AcceptInviteInput): Promise<string> {
  const trade = input.trade?.trim();
  const { data, error } = await client.rpc("accept_invite", {
    code: input.code,
    full_name: input.fullName,
    trade: trade ? trade : undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}
