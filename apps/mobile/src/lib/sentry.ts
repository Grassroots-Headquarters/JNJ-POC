import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  // No DSN (local development, CI) means Sentry does nothing at all.
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
});

export { Sentry };
