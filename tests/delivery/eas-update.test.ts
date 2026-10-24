import { describe, expect, it } from "vitest";

import { GITHUB_SECRETS, GITHUB_VARIABLES } from "./contracts";
import { loadWorkflow } from "./workflow";

// Seam: the manual EAS Update workflow. Catches a channel name or EAS
// environment mapping drifting from eas.json; cannot prove an update lands.
describe("eas-update workflow", () => {
  const wf = loadWorkflow("eas-update.yml");
  const dispatch = wf.doc.on.workflow_dispatch as { inputs: Record<string, { required: boolean; options?: string[] }> };

  it("is started by hand with a channel and a message", () => {
    expect(Object.keys(wf.doc.on)).toEqual(["workflow_dispatch"]);
    expect(dispatch.inputs.channel.options).toEqual(["staging", "production"]);
    expect(dispatch.inputs.channel.required).toBe(true);
    expect(dispatch.inputs.message.required).toBe(true);
  });

  it("references only the secrets and variables the wizard publishes", () => {
    expect(wf.secrets.filter((s) => !(GITHUB_SECRETS as readonly string[]).includes(s))).toEqual([]);
    expect(wf.vars.filter((v) => !(GITHUB_VARIABLES as readonly string[]).includes(v))).toEqual([]);
  });

  it("deploys under the GitHub environment named after the channel, so production waits for approval", () => {
    expect(wf.environmentOf("update")).toBe("${{ inputs.channel }}");
  });

  it("publishes to the chosen channel with the matching EAS environment and the message", () => {
    expect(wf.runs).toMatch(/eas update --channel "\$\{\{ inputs\.channel \}\}" --environment "\$EAS_ENVIRONMENT" --message "\$MESSAGE" --non-interactive/);
    expect(wf.text).toMatch(/inputs\.channel == 'production' && 'production' \|\| 'preview'/);
  });

  it("uploads the update's source maps to Sentry when a token exists", () => {
    const upload = wf.steps.find((s) => /sentry-expo-upload-sourcemaps dist/.test(s.run ?? ""));
    expect(upload?.if).toMatch(/SENTRY_AUTH_TOKEN != ''/);
  });
});
