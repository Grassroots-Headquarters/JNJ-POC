import { defineConfig } from "vitest/config";

/**
 * Integration tests against the running local Supabase stack, logged in as
 * the fixed test Users through @mba/harness. Run with `pnpm test:integration`
 * after `pnpm supabase start`; they are not part of `pnpm test`.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
