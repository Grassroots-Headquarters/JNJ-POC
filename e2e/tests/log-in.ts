import { expect, type Page } from "@playwright/test";
import { TEST_OTP } from "@mba/harness";

/** Logs into the Admin app with the fixed test code. The caller checks where it lands. */
export async function logInToAdminApp(page: Page, mobile: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill(mobile);
  await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await page.getByLabel("Login code").fill(TEST_OTP);
  await page.getByRole("button", { name: "Log in" }).click();
}
