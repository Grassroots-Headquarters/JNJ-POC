import { TEST_OTP, TEST_USERS, createAnonClient, signInAs } from "@mba/harness";
import { requestLoginCode, verifyLoginCode, WRONG_CODE_MESSAGE } from "@mba/shared";
import { describe, expect, it } from "vitest";

describe("SMS code login", () => {
  it("logs a fixed test User in with the test code", async () => {
    const client = await signInAs(TEST_USERS.samSite);
    const { data } = await client.auth.getUser();
    expect(data.user?.phone).toBe("447700900002");
  });

  it("rejects a wrong code with a message that says to send a new one", async () => {
    const client = createAnonClient();
    await requestLoginCode(client, TEST_USERS.samSite);
    await expect(verifyLoginCode(client, TEST_USERS.samSite, "000000")).rejects.toThrow(WRONG_CODE_MESSAGE);
    const { data } = await client.auth.getSession();
    expect(data.session).toBeNull();
  });

  it("lets a User ask for a new code and log in with it", async () => {
    const client = createAnonClient();
    await requestLoginCode(client, TEST_USERS.samSite);
    await requestLoginCode(client, TEST_USERS.samSite);
    await verifyLoginCode(client, TEST_USERS.samSite, TEST_OTP);
    const { data } = await client.auth.getSession();
    expect(data.session).not.toBeNull();
  });
});
