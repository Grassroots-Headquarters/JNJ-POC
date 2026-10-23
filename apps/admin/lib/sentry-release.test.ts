import { describe, expect, it } from "vitest";

import { sentryRelease } from "./sentry-release";

// Seam: the release label next.config.ts hands to Sentry and inlines into the
// app. Catches the label format drifting from contracts (admin@<sha>).
describe("sentryRelease", () => {
  it("is admin@<sha> from the commit Vercel is building", () => {
    expect(sentryRelease({ VERCEL_GIT_COMMIT_SHA: "0123abcd" })).toBe("admin@0123abcd");
  });

  it("falls back to the GitHub Actions commit", () => {
    expect(sentryRelease({ GITHUB_SHA: "feed0000" })).toBe("admin@feed0000");
  });

  it("lets an explicit NEXT_PUBLIC_SENTRY_RELEASE win", () => {
    expect(sentryRelease({ NEXT_PUBLIC_SENTRY_RELEASE: "admin@custom", VERCEL_GIT_COMMIT_SHA: "x" })).toBe("admin@custom");
  });

  it("is unset for a local build, so Sentry gets no release", () => {
    expect(sentryRelease({})).toBeUndefined();
  });
});
