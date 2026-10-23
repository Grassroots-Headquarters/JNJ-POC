import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Sentry release label for the Mobile app, `mobile@<version>+<sha>`. The sha
 * comes from whichever system is building: EAS Build, Vercel (web test site)
 * or GitHub Actions (eas update). `EXPO_PUBLIC_SENTRY_RELEASE` overrides it.
 */
export function sentryRelease(version: string | undefined, env: NodeJS.ProcessEnv): string | undefined {
  if (env.EXPO_PUBLIC_SENTRY_RELEASE) return env.EXPO_PUBLIC_SENTRY_RELEASE;
  const sha = env.EAS_BUILD_GIT_COMMIT_HASH ?? env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA;
  return version && sha ? `mobile@${version}+${sha}` : undefined;
}

// app.json stays the single static source (the wizard's `eas init` writes
// extra.eas.projectId there); this only derives what depends on it or on the
// build environment.
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = (config.extra?.eas as { projectId?: string } | undefined)?.projectId;
  return {
    ...(config as ExpoConfig),
    updates: {
      ...config.updates,
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
    },
    extra: {
      ...config.extra,
      sentryRelease: sentryRelease(config.version, process.env),
    },
  };
};
