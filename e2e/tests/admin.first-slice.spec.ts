import { createServiceClient, inviteCodeTextedTo, userIdForPhone } from "@jnj/harness";
import { normalisePhone } from "@jnj/shared";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { logInToAdminApp } from "./log-in";

// The first slice from spec #23, across the Admin app and the Mobile app's web
// build: an Admin signs their Company up, logs a Job and invites a Site team
// member onto it; she logs into the Mobile app by SMS code and sees the Job,
// which follows her Assignment; a second Company's User cannot see it.
// +447700900013 and +447700900014 are reserved for this journey (contracts: #29 uses 013-015).
const ADMIN_MOBILE = "07700 900013";
const ADMIN_PHONE = normalisePhone(ADMIN_MOBILE)!;
const SITE_TEAM_MOBILE = "07700 900014";
const SITE_TEAM_PHONE = normalisePhone(SITE_TEAM_MOBILE)!;
const COMPANY = "Slice Builders";
const SITE_TEAM_NAME = "Tia Trowel";
const JOB = "Birch Close kitchen";
const JOB_ADDRESS = "3 Birch Close, Bromley";
const MOBILE_WEB_URL = "http://localhost:8081";

/** A fresh browser context logged into the Admin app, on the Jobs list. */
async function adminAppAs(browser: Browser, mobile: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await logInToAdminApp(page, mobile);
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  return page;
}

// Start each run (and retry) from nobody: no Company for the Admin, no Membership for the Site team member.
test.beforeEach(async () => {
  const service = createServiceClient();
  const admin = await userIdForPhone(ADMIN_PHONE);
  if (admin) {
    const { data } = await service.from("memberships").select("company_id").eq("user_id", admin);
    const companies = (data ?? []).map((m) => m.company_id);
    if (companies.length) await service.from("companies").delete().in("id", companies);
  }
  const siteTeamMember = await userIdForPhone(SITE_TEAM_PHONE);
  if (siteTeamMember) await service.from("memberships").delete().eq("user_id", siteTeamMember);
  await service.from("invites").delete().eq("phone", SITE_TEAM_PHONE);
});

test("an Admin signs up, logs a Job and invites a Site team member, who sees it in the Mobile app; another Company cannot", async ({
  page,
  browser,
}) => {
  // 1. The Admin signs their Company up in the Admin app.
  await page.goto("/sign-up");
  await page.getByLabel("Company name").fill(COMPANY);
  await page.getByLabel("Your name").fill("Sky Slice");
  await page.getByLabel("Mobile number").fill(ADMIN_MOBILE);
  await page.getByRole("button", { name: "Send login code" }).click();
  await page.getByLabel("Login code").fill("123456");
  await page.getByRole("button", { name: "Create company" }).click();

  // 2. The guided first Job: log it, then invite the Site team member onto it.
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "Log your first Job" })).toBeVisible();
  await page.getByLabel("Job name").fill(JOB);
  await page.getByLabel("Address", { exact: true }).fill(JOB_ADDRESS);
  await page.getByLabel("Start date").fill("2026-11-02");
  await page.getByRole("button", { name: "Create job" }).click();

  await expect(page.getByRole("heading", { name: `Invite your team to ${JOB}` })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(SITE_TEAM_NAME);
  await page.getByLabel("Mobile", { exact: true }).fill(SITE_TEAM_MOBILE);
  await page.getByLabel("Role", { exact: true }).selectOption({ label: "Site team" });
  await page.getByRole("button", { name: "Send invite by SMS" }).click();
  await expect(page.getByText(`Invite sent to ${SITE_TEAM_MOBILE}.`)).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();

  // The Job page shows the Job and the Invite waiting to be accepted.
  await expect(page.getByRole("heading", { name: JOB })).toBeVisible();
  const jobUrl = page.url();
  await expect(page.getByTestId("job-details")).toContainText(JOB_ADDRESS);
  await expect(page.getByTestId("job-details")).toContainText("Starts 2 Nov 2026");
  await expect(page.getByTestId("job-invite").filter({ hasText: SITE_TEAM_NAME })).toContainText("Invite sent");

  // 3. The Site team member opens the Invite, logs into the Mobile app by SMS code and sees the Job.
  const code = await inviteCodeTextedTo(SITE_TEAM_PHONE);
  const phone = await (await browser.newContext()).newPage();
  await phone.goto(`${MOBILE_WEB_URL}/invite/${code}`);
  await phone.getByLabel("Mobile number").fill(SITE_TEAM_MOBILE);
  await phone.getByRole("button", { name: "Send login code" }).click();
  await phone.getByLabel("Login code").fill("123456");
  await phone.getByRole("button", { name: "Log in" }).click();
  await expect(phone.getByLabel("Your name")).toHaveValue(SITE_TEAM_NAME);
  await phone.getByRole("button", { name: `Join ${COMPANY}` }).click();

  await expect(phone.getByText("My jobs")).toBeVisible();
  const phoneJob = phone.getByTestId("job").filter({ hasText: JOB });
  await expect(phoneJob).toContainText(JOB_ADDRESS);

  // The Admin marks her Job lead; the Mobile app says so.
  await page.reload();
  const person = page.getByTestId("job-person").filter({ hasText: SITE_TEAM_NAME });
  await expect(person).toContainText("Site team");
  await person.getByRole("button", { name: "Make Job lead" }).click();
  await expect(person).toContainText("Site team · Job lead");
  await phone.reload();
  await expect(phoneJob).toContainText("You're the Job lead");

  // Taking her off the Job makes it disappear from the Mobile app.
  page.once("dialog", (dialog) => void dialog.accept());
  await person.getByRole("button", { name: "Remove from Job" }).click();
  await expect(page.getByTestId("job-person")).toHaveCount(0);
  await phone.reload();
  await expect(phone.getByTestId("jobs-empty")).toBeVisible();
  await expect(phone.getByTestId("job")).toHaveCount(0);

  // Assigning her again, as Job lead, brings it back.
  await page.getByLabel("Person").selectOption({ label: `${SITE_TEAM_NAME} (Site team)` });
  await page.getByLabel("Job lead").check();
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByTestId("job-person").filter({ hasText: SITE_TEAM_NAME })).toContainText("Job lead");
  await phone.reload();
  await expect(phone.getByTestId("job").filter({ hasText: JOB })).toContainText("You're the Job lead");

  // The Admin's Jobs list shows it with its Job lead.
  await page.getByRole("link", { name: "‹ Jobs" }).click();
  await expect(page.getByTestId("job").filter({ hasText: JOB })).toContainText(`Job lead ${SITE_TEAM_NAME}`);

  // 4. A User from a second Company cannot see the Job, in either app.
  const bea = await adminAppAs(browser, "07700 900003");
  await expect(bea.getByTestId("current-company")).toHaveText("Hart Builders");
  await expect(bea.getByTestId("job").filter({ hasText: "Hart Lane refit" })).toBeVisible();
  await expect(bea.getByTestId("job").filter({ hasText: JOB })).toHaveCount(0);
  await bea.goto(jobUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(bea.getByText("Job not found")).toBeVisible();

  const beaPhone = await (await browser.newContext()).newPage();
  await beaPhone.goto(MOBILE_WEB_URL);
  await beaPhone.getByLabel("Mobile number").fill("07700 900003");
  await beaPhone.getByRole("button", { name: "Send login code" }).click();
  await beaPhone.getByLabel("Login code").fill("123456");
  await beaPhone.getByRole("button", { name: "Log in" }).click();
  await expect(beaPhone.getByTestId("current-company")).toContainText("Hart Builders");
  await expect(beaPhone.getByTestId("job").filter({ hasText: "Hart Lane refit" })).toBeVisible();
  await expect(beaPhone.getByTestId("job").filter({ hasText: JOB })).toHaveCount(0);
});
