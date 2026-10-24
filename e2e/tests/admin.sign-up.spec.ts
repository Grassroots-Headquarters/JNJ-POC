import { expect, test } from "@playwright/test";

// +447700900006 is reserved for this journey (contracts: free test numbers).
const ADMIN_MOBILE = "07700 900006";

test("an Admin signs their Company up with an SMS code and lands on the guided first Job", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Company name").fill("Playwright Builders");
  await page.getByLabel("Your name").fill("Pat Playwright");
  await page.getByLabel("Mobile number").fill(ADMIN_MOBILE);
  await page.getByLabel("Referral code (optional)").fill("a7q4kx");
  await page.getByRole("button", { name: "Send login code" }).click();

  await expect(page).toHaveURL(/\/verify$/);
  await expect(page.getByText(`We texted a 6-digit code to ${ADMIN_MOBILE}`)).toBeVisible();

  // A wrong code is rejected and a new one can be requested.
  await page.getByLabel("Login code").fill("000000");
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByText("That code is wrong or has expired. Send a new code and try again.")).toBeVisible();
  await page.getByRole("button", { name: "Send a new code" }).click();
  await expect(page.getByText(`We texted a new code to ${ADMIN_MOBILE}.`)).toBeVisible();

  await page.getByLabel("Login code").fill("123456");
  await page.getByRole("button", { name: "Create company" }).click();

  // A new Company goes into the guided first Job, which can be skipped.
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "Log your first Job" })).toBeVisible();
  await expect(page.getByTestId("current-company")).toHaveText("Playwright Builders");
  await page.getByRole("link", { name: "Skip for now" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("current-company")).toHaveText("Playwright Builders");
  await expect(page.getByTestId("jobs-empty")).toContainText("No jobs here yet.");
  await expect(page.getByTestId("connected")).toContainText("Connected");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Mobile number")).toBeVisible();
});
