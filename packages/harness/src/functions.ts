import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { TypedClient } from "@jnj/shared";
import { localSupabase } from "./local-supabase";

/** The local URL of an Edge Function, as the apps call it. */
export function functionUrl(name: string): string {
  return `${localSupabase().url.replace(/\/$/, "")}/functions/v1/${name}`;
}

/**
 * POST a JSON body to an Edge Function as the User the client is logged in
 * as, the way `supabase.functions.invoke` does, returning the raw response so
 * tests can assert on status codes.
 */
export async function postFunctionAs(client: TypedClient, name: string, body: unknown): Promise<Response> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("The client is not logged in");
  return fetch(functionUrl(name), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: localSupabase().anonKey,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * A value from the local Edge Function env: the process env first (CI),
 * then `supabase/functions/.env`, then the committed `.env.example`, which
 * is what the local edge runtime read when the stack started.
 */
export function functionsEnv(name: string): string {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const dir = fileURLToPath(new URL("../../../supabase/functions/", import.meta.url));
  for (const file of [".env", ".env.example"]) {
    try {
      for (const line of readFileSync(`${dir}${file}`, "utf8").split("\n")) {
        const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (match && match[1] === name && match[2] !== "") return match[2].replace(/^"(.*)"$/, "$1");
      }
    } catch {
      // try the next file
    }
  }
  throw new Error(`${name} is not set in the environment or supabase/functions/.env`);
}
