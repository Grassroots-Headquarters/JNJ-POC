import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against production-style builds of both web apps, as CI does:
 * the Admin app via `next start` and the Mobile app's web export via `serve`.
 * Both must have been built with the local Supabase env values first.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "admin", use: { baseURL: "http://localhost:3000" }, testMatch: /admin\..*\.spec\.ts/ },
    { name: "mobile-web", use: { baseURL: "http://localhost:8081" }, testMatch: /mobile\..*\.spec\.ts/ },
  ],
  webServer: [
    {
      name: "admin",
      command: "pnpm --filter @jnj/admin start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: "..",
    },
    {
      name: "mobile-web",
      command: "pnpm --filter @jnj/mobile serve:web",
      url: "http://localhost:8081",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: "..",
    },
  ],
});
