/**
 * Sentry release label for the Admin app, `admin@<sha>`. Vercel exposes the
 * commit it is building as VERCEL_GIT_COMMIT_SHA; GitHub Actions as
 * GITHUB_SHA. An explicit NEXT_PUBLIC_SENTRY_RELEASE overrides both. Local
 * builds get no release.
 */
export function sentryRelease(env: Record<string, string | undefined>): string | undefined {
  if (env.NEXT_PUBLIC_SENTRY_RELEASE) return env.NEXT_PUBLIC_SENTRY_RELEASE;
  const sha = env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA;
  return sha ? `admin@${sha}` : undefined;
}
