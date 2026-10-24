import { expect, test } from "@playwright/test";

test("the Admin app shows it is connected to Supabase", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("connected")).toContainText("Connected");
  await expect(page.getByTestId("platform-message")).toHaveText("connected");
});
