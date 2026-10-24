import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@mba/shared";

/** Supabase client for Client Components. Sessions live in cookies via @supabase/ssr. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
