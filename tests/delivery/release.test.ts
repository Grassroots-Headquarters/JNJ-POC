import { describe, expect, it } from "vitest";

import { GITHUB_SECRETS, GITHUB_VARIABLES } from "./contracts";
import { loadWorkflow } from "./workflow";

// Seam: the release workflow as GitHub Actions reads it. Catches a tag
// trigger, approval gate or production secret name going wrong; cannot prove
// the approval actually blocks (that is GitHub's environment setting).
describe("release workflow", () => {
  const wf = loadWorkflow("release.yml");

  it("runs on version tags only", () => {
    expect(wf.doc.on).toEqual({ push: { tags: ["v*"] } });
  });

  it("never cancels a running release", () => {
    expect(wf.doc.concurrency?.group).toBeTruthy();
    expect(wf.doc.concurrency?.["cancel-in-progress"]).toBe(false);
  });

  it("references only the secrets and variables the wizard publishes", () => {
    expect(wf.secrets.filter((s) => !(GITHUB_SECRETS as readonly string[]).includes(s))).toEqual([]);
    expect(wf.vars.filter((v) => !(GITHUB_VARIABLES as readonly string[]).includes(v))).toEqual([]);
  });

  it("gates the first deploying job on the production environment and chains the rest after it", () => {
    expect(wf.environments).toEqual(["production"]);
    expect(wf.environmentOf("supabase")).toBe("production");
    for (const [name, job] of Object.entries(wf.doc.jobs)) {
      if (name === "supabase") continue;
      expect(job.needs, `${name} must depend on the gated job`).toBeTruthy();
    }
  });

  it("deploys to the production Supabase project only", () => {
    expect(wf.secrets).toContain("SUPABASE_PRODUCTION_PROJECT_REF");
    expect(wf.secrets).toContain("SUPABASE_PRODUCTION_DB_PASSWORD");
    expect(wf.secrets.filter((s) => s.includes("STAGING"))).toEqual([]);
    expect(wf.runs).toMatch(/supabase link/);
    expect(wf.runs).toMatch(/supabase db push/);
    expect(wf.runs).toMatch(/supabase functions deploy/);
    expect(wf.runs).toMatch(/supabase secrets set .*SENTRY_RELEASE=edge@\$\{\{ github\.sha \}\}/);
  });

  it("builds store versions of the Mobile app and submits them", () => {
    expect(wf.runs).toMatch(/eas build --profile production --platform all --non-interactive --no-wait --auto-submit/);
    const easSteps = wf.steps.filter((s) => /eas build|expo\/expo-github-action/.test(`${s.run} ${s.uses}`));
    for (const step of easSteps) expect(step.if).toMatch(/env\.EXPO_TOKEN != ''/);
  });

  it("creates production Sentry releases for the edge functions and the Mobile app", () => {
    const releases = wf.steps.filter((s) => s.uses?.startsWith("getsentry/action-release@"));
    const labels = releases.map((s) => String(s.with?.release));
    expect(labels).toContain("edge@${{ github.sha }}");
    expect(labels.some((l) => l.startsWith("mobile@"))).toBe(true);
    for (const step of releases) expect(step.with?.environment).toBe("production");
  });

  it("publishes GitHub release notes for the tag", () => {
    expect(wf.runs).toMatch(/gh release create .*--generate-notes/);
    expect(wf.text).toMatch(/contents: write/);
  });
});
