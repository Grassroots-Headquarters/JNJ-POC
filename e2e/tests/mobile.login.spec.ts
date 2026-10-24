import { expect, test } from "@playwright/test";

test("a Site team member logs into the Mobile app with an SMS code and sees an empty My jobs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("My Builder App");
  await page.getByLabel("Mobile number").fill("07700 900002");
  await page.getByRole("button", { name: "Send login code" }).click();

  await expect(page.getByText("We texted a 6-digit code to 07700 900002")).toBeVisible();
  await page.getByLabel("Login code").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("My jobs")).toBeVisible();
  await expect(page.getByTestId("current-company")).toContainText("JNJ Building · Site team");
  await expect(page.getByTestId("jobs-empty")).toContainText("No jobs yet");
  // On the web build the browser tab names the Company too.
  await expect(page).toHaveTitle("JNJ Building");

  // The session survives a reload (AsyncStorage on web is localStorage).
  await page.reload();
  await expect(page.getByTestId("jobs-empty")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(page).toHaveTitle("My Builder App");
});
