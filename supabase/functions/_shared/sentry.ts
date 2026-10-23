// Sentry for Edge Functions. Import `serve` from here instead of calling
// Deno.serve directly: every thrown error is reported (when SENTRY_DSN is set)
// and answered with a plain 500. With no SENTRY_DSN, local runs and CI, the
// SDK is disabled and this is a thin wrapper around Deno.serve.
//
// SENTRY_RELEASE (edge@<sha>) and SENTRY_ENVIRONMENT (staging | production)
// are set per deploy by .github/workflows/staging.yml and release.yml;
// SENTRY_DSN is set once by scripts/setup-accounts.sh.
import * as Sentry from "npm:@sentry/deno@11.9.0";

const dsn = Deno.env.get("SENTRY_DSN") ?? "";

export const sentryEnabled = dsn !== "";

Sentry.init({
  dsn: dsn || undefined,
  enabled: sentryEnabled,
  release: Deno.env.get("SENTRY_RELEASE") || undefined,
  environment: Deno.env.get("SENTRY_ENVIRONMENT") || "local",
  // The Supabase edge runtime does not support every Deno integration.
  defaultIntegrations: false,
  tracesSampleRate: 0,
});

Sentry.setTag("region", Deno.env.get("SB_REGION") ?? "local");

type Handler = (request: Request) => Response | Promise<Response>;

/** Deno.serve with errors reported to Sentry and flushed before the 500 goes out. */
export function serve(handler: Handler): void {
  Deno.serve(async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      Sentry.captureException(error);
      await Sentry.flush(2000);
      console.error(error);
      return Response.json({ error: "internal" }, { status: 500 });
    }
  });
}

export { Sentry };
