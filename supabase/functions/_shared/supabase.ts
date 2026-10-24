// Supabase clients for Edge Functions. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const noSession = { persistSession: false, autoRefreshToken: false };

/** Bypasses RLS: only for the writes that must happen whatever the caller. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: noSession });
}

/** A client acting as the caller (their `Authorization` header), so RLS decides what they may do. */
export function callerClient(authorization: string): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: noSession,
  });
}
