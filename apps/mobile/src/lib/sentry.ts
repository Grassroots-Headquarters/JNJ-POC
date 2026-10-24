import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  // No DSN (local development, CI) means Sentry does nothing at all.
  enabled: Boolean(dsn),
  // mobile@<version>+<sha>, derived in app.config.ts from the build environment.
  release: Constants.expoConfig?.extra?.sentryRelease,
  tracesSampleRate: 0.1,
});

export { Sentry };
