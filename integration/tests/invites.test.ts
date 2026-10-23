import { COMPANY_A, TEST_USERS, createServiceClient, freeTestPhone, signInAs } from "@jnj/harness";
import {
  SendInviteError,
  acceptInvite,
  createInvite,
  inviteCodeFromSms,
  listInvites,
  listMembers,
  listMyMemberships,
  resendInvite,
  sendInvite,
  signUpCompany,
  type Invite,
  type TypedClient,
} from "@jnj/shared";
import { beforeAll, describe, expect, it } from "vitest";

// Free test numbers for ticket #28 are 009-012. Playwright uses 010; these
// tests use 009 (a new person), 011 (an Admin of a third Company) and 012.
const IVY = freeTestPhone(9);
const OWEN = freeTestPhone(11);
const PAT = freeTestPhone(12);

/** The last SMS the fake outbox recorded for a number, read as the test harness, not as a User. */
async function lastSmsTo(phone: string): Promise<{ to: string; body: string } | null> {
  const { data, error } = await createServiceClient()
    .from("outbound_sms")
    .select("to, body")
    .eq("to", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

describe("Inviting a new person to the Company", () => {
  let alex: TypedClient;
  let invite: Invite;

  beforeAll(async () => {
    alex = await signInAs(TEST_USERS.alexAdmin);
  });

  it("creates the Invite and texts the invited number a link with the code", async () => {
    invite = await createInvite(alex, { companyId: COMPANY_A.id, phone: "07700 900009", role: "site_team", fullName: "Ivy" });
    expect(invite).toMatchObject({ phone: IVY, role: "site_team", fullName: "Ivy", status: "pending" });

    await sendInvite(alex, invite.id);

    const sms = await lastSmsTo(IVY);
    expect(sms?.body).toBe(
      `JNJ Building has invited you to the JNJ Site App as Site team. Open https://app.example.com/invite/${invite.code}`,
    );
    expect(inviteCodeFromSms(sms!.body)).toBe(invite.code);
  });

  it("shows the Admin the Invite as pending", async () => {
    const invites = await listInvites(alex, COMPANY_A.id);
    expect(invites).toContainEqual(expect.objectContaining({ id: invite.id, status: "pending" }));
  });

  it("lets the invited number log in and accept, which makes them a Member", async () => {
    const ivy = await signInAs(IVY);
    expect(await listMyMemberships(ivy)).toEqual([]);

    const companyId = await acceptInvite(ivy, { code: invite.code, fullName: "Ivy Invitee" });

    expect(companyId).toBe(COMPANY_A.id);
    expect(await listMyMemberships(ivy)).toEqual([
      { companyId: COMPANY_A.id, companyName: COMPANY_A.name, role: "site_team" },
    ]);
    const members = await listMembers(alex, COMPANY_A.id);
    expect(members).toContainEqual(expect.objectContaining({ fullName: "Ivy Invitee", role: "site_team", trade: null }));
    expect(await listInvites(alex, COMPANY_A.id)).toContainEqual(expect.objectContaining({ id: invite.id, status: "accepted" }));
  });

  it("refuses the same code a second time", async () => {
    const ivy = await signInAs(IVY);
    await expect(acceptInvite(ivy, { code: invite.code, fullName: "Ivy Invitee" })).rejects.toThrow(
      "This Invite has already been used",
    );
  });

  it("adds a second Membership to an existing User without a new login", async () => {
    // Owen runs a third Company and invites Ivy, who already belongs to Company A.
    const owen = await signInAs(OWEN);
    const owensCompany = await signUpCompany(owen, { companyName: "Owen Roofing", fullName: "Owen Owner" });
    const second = await createInvite(owen, { companyId: owensCompany, phone: IVY, role: "subcontractor" });
    await sendInvite(owen, second.id);
    expect(inviteCodeFromSms((await lastSmsTo(IVY))!.body)).toBe(second.code);

    const ivy = await signInAs(IVY);
    await acceptInvite(ivy, { code: second.code, fullName: "Ivy Invitee", trade: "Plasterer" });

    expect(await listMyMemberships(ivy)).toEqual([
      { companyId: COMPANY_A.id, companyName: COMPANY_A.name, role: "site_team" },
      { companyId: owensCompany, companyName: "Owen Roofing", role: "subcontractor" },
    ]);
    expect(await listMembers(owen, owensCompany)).toContainEqual(
      expect.objectContaining({ fullName: "Ivy Invitee", role: "subcontractor", trade: "Plasterer" }),
    );
  });
});

describe("Who may send an Invite", () => {
  it("refuses a Site team member", async () => {
    const sam = await signInAs(TEST_USERS.samSite);
    await expect(
      createInvite(sam, { companyId: COMPANY_A.id, phone: PAT, role: "site_team" }),
    ).rejects.toThrow("Only an Admin can send Invites");
  });

  it("answers 403 to another Company's Admin and texts nobody", async () => {
    const alex = await signInAs(TEST_USERS.alexAdmin);
    const invite = await createInvite(alex, { companyId: COMPANY_A.id, phone: PAT, role: "admin" });

    const bea = await signInAs(TEST_USERS.beaBoss);
    const attempt = sendInvite(bea, invite.id);
    await expect(attempt).rejects.toBeInstanceOf(SendInviteError);
    await expect(attempt).rejects.toMatchObject({ status: 403 });
    expect(await lastSmsTo(PAT)).toBeNull();

    // The expired and resent flow continues with this Invite.
    const { error } = await createServiceClient()
      .from("invites")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", invite.id);
    expect(error).toBeNull();

    const pat = await signInAs(PAT);
    await expect(acceptInvite(pat, { code: invite.code, fullName: "Pat" })).rejects.toThrow("This Invite has expired");
    expect(await listInvites(alex, COMPANY_A.id)).toContainEqual(expect.objectContaining({ id: invite.id, status: "expired" }));

    const resent = await resendInvite(alex, invite.id);
    expect(resent.code).not.toBe(invite.code);
    await sendInvite(alex, resent.id);
    expect(inviteCodeFromSms((await lastSmsTo(PAT))!.body)).toBe(resent.code);
    await expect(acceptInvite(pat, { code: invite.code, fullName: "Pat" })).rejects.toThrow("Invite not found");
    expect(await acceptInvite(pat, { code: resent.code, fullName: "Pat Promoted" })).toBe(COMPANY_A.id);
    expect(await listMyMemberships(pat)).toEqual([{ companyId: COMPANY_A.id, companyName: COMPANY_A.name, role: "admin" }]);
  });
});
