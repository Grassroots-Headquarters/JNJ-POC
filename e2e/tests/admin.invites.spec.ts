import { createServiceClient, inviteCodeTextedTo, userIdForPhone } from "@jnj/harness";
import { normalisePhone } from "@jnj/shared";
import { expect, test } from "@playwright/test";
import { logInToAdminApp } from "./log-in";

// +447700900010 is reserved for this journey (contracts: ticket #28 uses 009-012).
const INVITEE_MOBILE = "07700 900010";
const INVITEE_PHONE = normalisePhone(INVITEE_MOBILE)!;
const INVITEE_NAME = "Iris Invitee";
const ADMIN_URL = "http://localhost:3000";
const MOBILE_WEB_URL = "http://localhost:8081";

// Leave the invitee as a fresh person again, so the journey can be re-run (and retried) on one database.
test.beforeEach(async () => {
  const service = createServiceClient();
  const invitee = await userIdForPhone(INVITEE_PHONE);
  if (invitee) await service.from("memberships").delete().eq("user_id", invitee);
  await service.from("invites").delete().eq("phone", INVITEE_PHONE);
});

test("an Admin invites a Site team member by SMS and they join from the Mobile app's web build", async ({
  page,
  browser,
}) => {
  // Alex, Admin of JNJ Building, logs into the Admin app.
  await logInToAdminApp(page, "07700 900001");
  await expect(page.getByTestId("current-company")).toHaveText("JNJ Building");

  // Team: invite Iris as Site team.
  await page.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/\/team$/);
  await page.getByLabel("Name", { exact: true }).fill(INVITEE_NAME);
  await page.getByLabel("Mobile", { exact: true }).fill(INVITEE_MOBILE);
  await page.getByLabel("Role", { exact: true }).selectOption({ label: "Site team" });
  await page.getByRole("button", { name: "Send invite by SMS" }).click();
  await expect(page.getByText(`Invite sent to ${INVITEE_MOBILE}.`)).toBeVisible();

  const inviteRow = page.getByTestId("invite").filter({ hasText: INVITEE_PHONE });
  await expect(inviteRow).toContainText("Invite sent");
  await expect(inviteRow).toContainText("Site team");

  const code = await inviteCodeTextedTo(INVITEE_PHONE);

  // Without the app, the link opens the Admin app's public Invite page.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`${ADMIN_URL}/invite/${code}`);
  await expect(visitorPage.getByTestId("invite-company")).toHaveText("JNJ Building has invited you");
  await expect(visitorPage.getByTestId("app-store")).toBeVisible();
  await expect(visitorPage.getByTestId("google-play")).toBeVisible();
  await expect(visitorPage.getByTestId("open-in-app")).toHaveAttribute("href", `jnjsite://invite/${code}`);
  await visitor.close();

  // With the app, the link lands on the Invite screen: log in, confirm the name, join.
  const phone = await browser.newContext();
  const app = await phone.newPage();
  await app.goto(`${MOBILE_WEB_URL}/invite/${code}`);
  await app.getByLabel("Mobile number").fill(INVITEE_MOBILE);
  await app.getByRole("button", { name: "Send login code" }).click();
  await app.getByLabel("Login code").fill("123456");
  await app.getByRole("button", { name: "Log in" }).click();

  await expect(app.getByTestId("invite-company")).toHaveText("JNJ Building");
  await expect(app.getByLabel("Your name")).toHaveValue(INVITEE_NAME);
  await app.getByRole("button", { name: "Join JNJ Building" }).click();

  await expect(app.getByText("My jobs")).toBeVisible();
  await expect(app.getByTestId("current-company")).toContainText(`JNJ Building · Site team · Logged in as ${INVITEE_NAME}`);
  await phone.close();

  // Back in the Admin app the Invite reads Accepted and Iris is on the team.
  await page.reload();
  await expect(page.getByTestId("invite").filter({ hasText: INVITEE_PHONE })).toContainText("Accepted");
  await expect(page.getByTestId("member").filter({ hasText: INVITEE_NAME })).toContainText("Site team");
});
