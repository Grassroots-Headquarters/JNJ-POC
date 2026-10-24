import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export type LocalSupabase = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cached: LocalSupabase | undefined;

/**
 * Where the local Supabase stack is. Reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`
 * and `SUPABASE_SERVICE_ROLE_KEY` when set (CI), otherwise asks
 * `supabase status` from the repo root.
 */
export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  const fromEnv = readEnv(process.env);
  cached = fromEnv ?? readEnv(statusEnv());
  if (!cached) {
    throw new Error("Local Supabase is not running: start it with `pnpm supabase start`");
  }
  return cached;
}

function readEnv(env: Record<string, string | undefined>): LocalSupabase | undefined {
  const url = env.SUPABASE_URL ?? env.API_URL;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.ANON_KEY ?? env.PUBLISHABLE_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY ?? env.SECRET_KEY;
  if (!url || !anonKey || !serviceRoleKey) return undefined;
  return { url, anonKey, serviceRoleKey };
}

function statusEnv(): Record<string, string> {
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
  let output: string;
  try {
    output = execFileSync("pnpm", ["--silent", "supabase", "status", "-o", "env"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return {};
  }
  const env: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}
