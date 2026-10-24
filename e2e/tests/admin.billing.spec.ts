import { expect, test, type Page } from "@playwright/test";

// Seeded Users (contracts): Alex Admin of Company A, Sam Site team of Company A.
// No Stripe keys exist locally, so this stops short of Stripe's hosted pages.

async function logIn(page: Page, mobile: string) {
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill(mobile);
  await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await page.getByLabel("Login code").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("current-company")).toHaveText("JNJ Building");
}

test("an Admin opens Billing and sees the Client Portal off", async ({ page }) => {
  await logIn(page, "07700 900001");
  await page.getByRole("link", { name: "Billing" }).click();

  await expect(page).toHaveURL(/\/billing$/);
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByTestId("client-portal-state")).toHaveText("Off");
  await expect(page.getByTestId("client-portal-detail")).toHaveText("Not switched on.");
  await expect(page.getByRole("button", { name: "Switch on Client Portal" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Manage card and invoices" })).toBeVisible();
  await expect(page.getByLabel("Billing email")).toBeVisible();
  // No price is shown anywhere on the page.
  await expect(page.locator("main")).not.toContainText(/£|\$\d/);
});

test("a Site team member cannot reach Billing", async ({ page }) => {
  await logIn(page, "07700 900002");
  await expect(page.getByRole("link", { name: "Billing" })).toHaveCount(0);

  await page.goto("/billing");
  await expect(page.getByTestId("billing-admins-only")).toContainText("Only Admins can manage billing");
  await expect(page.getByRole("button", { name: "Switch on Client Portal" })).toHaveCount(0);
});
