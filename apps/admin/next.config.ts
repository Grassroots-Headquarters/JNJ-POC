import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

import { sentryRelease } from "./lib/sentry-release";

// admin@<sha>; inlined into the client and server bundles so every runtime
// reports the same release that received the source maps.
const release = sentryRelease(process.env);

const nextConfig: NextConfig = {
  // The app reads cookies on most routes, so the partial prerendering model is off.
  cacheComponents: false,
  transpilePackages: ["@mba/shared"],
  ...(release ? { env: { NEXT_PUBLIC_SENTRY_RELEASE: release } } : {}),
  async headers() {
    return [
      {
        // iOS reads the universal links file as JSON even though it has no extension.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // EU organisations set SENTRY_URL=https://de.sentry.io (the wizard does).
  sentryUrl: process.env.SENTRY_URL,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Source maps are only uploaded when a token is present (CI/Vercel), never locally.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  release: { name: release },
  telemetry: false,
});
