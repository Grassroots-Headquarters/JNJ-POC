import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type TypedClient = SupabaseClient<Database>;

/**
 * A supabase-js client typed against the generated schema. The Mobile app
 * uses this directly; the Admin app uses `@supabase/ssr` for cookie handling
 * but shares the same `Database` type.
 */
export function createTypedClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">,
): TypedClient {
  return createClient<Database>(url, anonKey, options);
}
