// Names from contracts.md "Delivery pipeline names". The wizard
// (scripts/setup-accounts.sh, stage 14) publishes exactly these; the workflows
// under .github/workflows may reference nothing else.
export const GITHUB_SECRETS = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_STAGING_PROJECT_REF",
  "SUPABASE_STAGING_DB_PASSWORD",
  "SUPABASE_PRODUCTION_PROJECT_REF",
  "SUPABASE_PRODUCTION_DB_PASSWORD",
  "EXPO_TOKEN",
  "SENTRY_AUTH_TOKEN",
  // Provided by GitHub itself, never set by the wizard.
  "GITHUB_TOKEN",
] as const;

export const GITHUB_VARIABLES = [
  "SENTRY_ORG",
  "SENTRY_PROJECT_ADMIN",
  "SENTRY_PROJECT_MOBILE",
  "SENTRY_PROJECT_EDGE",
  // Optional: the Sentry region URL (ticket #25 decision), default https://sentry.io.
  "SENTRY_URL",
] as const;

export const GITHUB_ENVIRONMENTS = ["staging", "production"] as const;

export const EAS_PROFILES = ["development", "staging", "production"] as const;
