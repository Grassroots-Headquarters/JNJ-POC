import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { EAS_PROFILES } from "./contracts";

const mobile = resolve(import.meta.dirname, "../../apps/mobile");
const readJson = (file: string) => JSON.parse(readFileSync(resolve(mobile, file), "utf8"));

// Seam: the files EAS CLI and Expo read. Catches a profile, channel or
// update policy drifting from the workflows; cannot prove a build succeeds.
describe("eas.json", () => {
  const eas = readJson("eas.json");

  it("has the three build profiles, each on the EAS Update channel of the same name", () => {
    expect(Object.keys(eas.build).sort()).toEqual([...EAS_PROFILES].sort());
    for (const profile of EAS_PROFILES) expect(eas.build[profile].channel).toBe(profile);
  });

  it("builds staging for internal distribution and production for the stores, both auto-incrementing", () => {
    expect(eas.build.staging).toMatchObject({ distribution: "internal", autoIncrement: true, environment: "preview" });
    expect(eas.build.production).toMatchObject({ distribution: "store", autoIncrement: true, environment: "production" });
    expect(eas.build.development).toMatchObject({ developmentClient: true, distribution: "internal" });
    expect(eas.cli.appVersionSource).toBe("remote");
  });

  it("submits staging to TestFlight and Play internal testing, production to the stores", () => {
    expect(eas.submit.staging.android).toMatchObject({ track: "internal" });
    expect(eas.submit.production.android).toMatchObject({ track: "production", releaseStatus: "draft" });
    for (const profile of ["staging", "production"]) {
      expect(eas.submit[profile].ios.ascAppId).toBeTruthy();
      expect(eas.submit[profile].ios.appleTeamId).toBeTruthy();
    }
  });
});

describe("app config", () => {
  const appJson = readJson("app.json");

  it("leaves the EAS project id empty for the wizard's eas init", () => {
    expect(appJson.expo.extra.eas.projectId).toBe("");
  });

  it("pins the expo-updates runtime to the app version", () => {
    expect(appJson.expo.runtimeVersion).toEqual({ policy: "appVersion" });
    expect(appJson.expo.updates).toMatchObject({ enabled: true, fallbackToCacheTimeout: 0 });
  });

  it("derives the EAS Update URL from the project id once eas init has filled it in", async () => {
    const { default: appConfig } = await import("../../apps/mobile/app.config");
    const unconfigured = appConfig({ config: appJson.expo, projectRoot: mobile, staticConfigPath: null, packageJsonPath: null });
    expect(unconfigured.updates?.url).toBeUndefined();
    const withId = { ...appJson.expo, extra: { eas: { projectId: "0f5c2a2e-1111-2222-3333-444444444444" } } };
    const configured = appConfig({ config: withId, projectRoot: mobile, staticConfigPath: null, packageJsonPath: null });
    expect(configured.updates?.url).toBe("https://u.expo.dev/0f5c2a2e-1111-2222-3333-444444444444");
    expect(configured.extra?.eas).toEqual({ projectId: "0f5c2a2e-1111-2222-3333-444444444444" });
  });

  it("labels the Sentry release mobile@<version>+<sha> from whichever build system is running", async () => {
    const { sentryRelease } = await import("../../apps/mobile/app.config");
    expect(sentryRelease("1.0.0", { EAS_BUILD_GIT_COMMIT_HASH: "abc123" })).toBe("mobile@1.0.0+abc123");
    expect(sentryRelease("1.0.0", { VERCEL_GIT_COMMIT_SHA: "def456" })).toBe("mobile@1.0.0+def456");
    expect(sentryRelease("1.0.0", { GITHUB_SHA: "0123456" })).toBe("mobile@1.0.0+0123456");
    expect(sentryRelease("1.0.0", { EXPO_PUBLIC_SENTRY_RELEASE: "mobile@9.9.9+custom", GITHUB_SHA: "x" })).toBe("mobile@9.9.9+custom");
    expect(sentryRelease("1.0.0", {})).toBeUndefined();
  });
});
