// Words the apps and the Edge Functions share. The send-invite Edge Function
// (Deno) imports this file directly, so it has no runtime imports and its one
// type import names the file with its extension.
import type { Enums } from "./database.types.ts";

export const roleLabel: Record<Enums<"role">, string> = {
  admin: "Admin",
  site_team: "Site team",
  subcontractor: "Subcontractor",
};

/** The link carried by the Invite SMS; the Admin app serves it as the fallback page. */
export function inviteLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}/invite/${code}`;
}

/** The text of the Invite SMS. */
export function inviteSms(invite: { companyName: string; role: Enums<"role">; baseUrl: string; code: string }): string {
  return (
    `${invite.companyName} has invited you to My Builder App as ${roleLabel[invite.role]}. ` +
    `Open ${inviteLink(invite.baseUrl, invite.code)}`
  );
}

/** The Invite code inside an SMS body, or null when there is no Invite link in it. */
export function inviteCodeFromSms(body: string): string | null {
  return /\/invite\/([A-HJ-NP-Z2-9]{12})\b/.exec(body)?.[1] ?? null;
}
