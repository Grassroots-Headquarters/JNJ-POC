import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GITHUB_SECRETS, GITHUB_VARIABLES } from "./contracts";

// Seam: the names the wizard publishes to GitHub. Together with the workflow
// tests this proves both ends of the pipeline agree on every secret and
// variable name; it cannot prove the values are right.
describe("scripts/setup-accounts.sh", () => {
  const script = readFileSync(resolve(import.meta.dirname, "../../scripts/setup-accounts.sh"), "utf8");
  const names = (fn: string) =>
    [...new Set([...script.matchAll(new RegExp(`^\\s*${fn} ([A-Z0-9_]+)`, "gm"))].map((m) => m[1]))].sort();

  it("sets every GitHub secret the workflows read, and no other", () => {
    expect(names("set_secret")).toEqual([...GITHUB_SECRETS].filter((s) => s !== "GITHUB_TOKEN").sort());
  });

  it("sets every GitHub variable the workflows read, and no other", () => {
    expect(names("set_var")).toEqual([...GITHUB_VARIABLES].sort());
  });
});
