import { describe, expect, it } from "vitest";
import { inviteCodeFromSms, inviteLink, inviteSms, inviteStatus } from "./invites";

const now = new Date("2026-10-23T12:00:00Z");
const pending = { accepted_at: null, cancelled_at: null, expires_at: "2026-10-30T12:00:00Z" };

describe("inviteStatus", () => {
  it("is pending while nothing has happened and the expiry is ahead", () => {
    expect(inviteStatus(pending, now)).toBe("pending");
  });

  it("is expired once the expiry has passed", () => {
    expect(inviteStatus({ ...pending, expires_at: "2026-10-23T11:59:59Z" }, now)).toBe("expired");
  });

  it("is accepted when it was used, even after the expiry", () => {
    expect(
      inviteStatus({ ...pending, accepted_at: "2026-10-24T09:00:00Z", expires_at: "2026-10-20T00:00:00Z" }, now),
    ).toBe("accepted");
  });

  it("is cancelled when an Admin cancelled it", () => {
    expect(inviteStatus({ ...pending, cancelled_at: "2026-10-23T10:00:00Z" }, now)).toBe("cancelled");
  });
});

describe("inviteSms", () => {
  it("names the Company and the Role and carries the link", () => {
    const body = inviteSms({ companyName: "JNJ Building", role: "site_team", baseUrl: "https://app.example.com/", code: "ABCDEFGHJKLM" });
    expect(body).toBe(
      "JNJ Building has invited you to the JNJ Site App as Site team. Open https://app.example.com/invite/ABCDEFGHJKLM",
    );
    expect(inviteCodeFromSms(body)).toBe("ABCDEFGHJKLM");
  });
});

describe("inviteLink and inviteCodeFromSms", () => {
  it("builds the link the SMS carries", () => {
    expect(inviteLink("https://app.example.com", "ABCDEFGHJKLM")).toBe("https://app.example.com/invite/ABCDEFGHJKLM");
    expect(inviteLink("https://app.example.com/", "ABCDEFGHJKLM")).toBe("https://app.example.com/invite/ABCDEFGHJKLM");
  });

  it("reads the code back out of the text", () => {
    const body = "JNJ Building has invited you to the JNJ Site App as Site team. Open https://app.example.com/invite/ABCDEFGHJKLM";
    expect(inviteCodeFromSms(body)).toBe("ABCDEFGHJKLM");
  });

  it("is null for a text without a link", () => {
    expect(inviteCodeFromSms("Your code is 123456")).toBeNull();
  });
});
