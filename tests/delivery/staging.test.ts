import { describe, expect, it } from "vitest";

import { GITHUB_SECRETS, GITHUB_VARIABLES } from "./contracts";
import { loadWorkflow } from "./workflow";

// Seam: the staging workflow as GitHub Actions reads it. These tests catch a
// secret, variable or environment name drifting from the wizard, a job that
// would touch production, or a missing trigger; they cannot run the workflow.
describe("staging workflow", () => {
  const wf = loadWorkflow("staging.yml");

  it("runs on every push to main", () => {
    expect(wf.doc.on).toMatchObject({ push: { branches: ["main"] } });
  });

  it("serialises runs with a workflow-level concurrency group", () => {
    expect(wf.doc.concurrency?.group).toBeTruthy();
  });

  it("references only the secrets and variables the wizard publishes", () => {
    expect(wf.secrets.filter((s) => !(GITHUB_SECRETS as readonly string[]).includes(s))).toEqual([]);
    expect(wf.vars.filter((v) => !(GITHUB_VARIABLES as readonly string[]).includes(v))).toEqual([]);
  });

  it("deploys to the staging Supabase project only, under the staging environment", () => {
    expect(wf.secrets).toContain("SUPABASE_STAGING_PROJECT_REF");
    expect(wf.secrets).toContain("SUPABASE_STAGING_DB_PASSWORD");
    expect(wf.secrets.filter((s) => s.includes("PRODUCTION"))).toEqual([]);
    expect(wf.environments).toEqual(["staging"]);
  });

  it("pushes migrations, deploys functions and labels the edge release edge@<sha>", () => {
    expect(wf.runs).toMatch(/supabase link/);
    expect(wf.runs).toMatch(/supabase db push/);
    expect(wf.runs).toMatch(/supabase functions deploy/);
    expect(wf.runs).toMatch(/supabase secrets set .*SENTRY_RELEASE=edge@\$\{\{ github\.sha \}\}/);
  });

  it("builds the staging Mobile app for both stores without waiting, and skips cleanly without EXPO_TOKEN", () => {
    expect(wf.runs).toMatch(/eas build --profile staging --platform all --non-interactive --no-wait --auto-submit/);
    // GitHub hides the secrets context from `if`, so the token is mirrored into
    // the job env and every EAS step is gated on it.
    const easSteps = wf.steps.filter((s) => /eas build|expo\/expo-github-action/.test(`${s.run} ${s.uses}`));
    expect(easSteps.length).toBeGreaterThanOrEqual(2);
    for (const step of easSteps) expect(step.if).toMatch(/env\.EXPO_TOKEN != ''/);
    const notice = wf.steps.find((s) => /::notice/.test(s.run ?? ""));
    expect(notice?.if).toMatch(/env\.EXPO_TOKEN == ''/);
  });

  it("creates Sentry releases for the edge functions and the Mobile app with the contract labels", () => {
    const releases = wf.steps.filter((s) => s.uses?.startsWith("getsentry/action-release@"));
    const labels = releases.map((s) => String(s.with?.release));
    expect(labels).toContain("edge@${{ github.sha }}");
    expect(labels.some((l) => l.startsWith("mobile@"))).toBe(true);
    for (const step of releases) {
      expect(step.with?.environment).toBe("staging");
    }
  });

  it("honours the optional SENTRY_URL variable with the public default", () => {
    expect(wf.text).toMatch(/vars\.SENTRY_URL \|\| 'https:\/\/sentry\.io'/);
  });
});
