import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

const workflowsDir = resolve(import.meta.dirname, "../../.github/workflows");

type Step = { uses?: string; run?: string; name?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, string> };
type Job = { environment?: string | { name: string }; needs?: string | string[]; steps: Step[]; if?: string; env?: Record<string, string> };
export type Workflow = {
  name: string;
  on: Record<string, unknown>;
  concurrency?: { group: string; "cancel-in-progress"?: boolean };
  jobs: Record<string, Job>;
};

export function loadWorkflow(file: string) {
  const text = readFileSync(resolve(workflowsDir, file), "utf8");
  const doc = parse(text) as Workflow;
  const unique = (re: RegExp) => [...new Set([...text.matchAll(re)].map((m) => m[1]))].sort();
  return {
    text,
    doc,
    secrets: unique(/secrets\.([A-Z0-9_]+)/g),
    vars: unique(/vars\.([A-Z0-9_]+)/g),
    environments: [...new Set(Object.values(doc.jobs).map((j) => j.environment).filter(Boolean))].map((e) =>
      typeof e === "string" ? e : e!.name,
    ),
    steps: Object.values(doc.jobs).flatMap((j) => j.steps),
    runs: Object.values(doc.jobs).flatMap((j) => j.steps.map((s) => s.run ?? "")).join("\n"),
    environmentOf: (job: string) => {
      const e = doc.jobs[job]?.environment;
      return typeof e === "string" ? e : e?.name;
    },
  };
}
