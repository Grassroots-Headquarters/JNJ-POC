import { createTypedClient, requestLoginCode, verifyLoginCode, type TypedClient } from "@mba/shared";
import { localSupabase } from "./local-supabase";
import { TEST_OTP } from "./seed";

const testAuthOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** A client with no session, as a visitor to either app has before login. */
export function createAnonClient(): TypedClient {
  const { url, anonKey } = localSupabase();
  return createTypedClient(url, anonKey, { auth: testAuthOptions });
}

/** A service-role client that bypasses RLS, for test setup and inspection only. */
export function createServiceClient(): TypedClient {
  const { url, serviceRoleKey } = localSupabase();
  return createTypedClient(url, serviceRoleKey, { auth: testAuthOptions });
}

/**
 * Log in as a test User the way the apps do: request a code, then verify
 * the fixed test code. Returns a typed client acting as that User, so tests
 * call the same tables and functions the apps call. An unseeded free test
 * number creates the User on first use.
 */
export async function signInAs(phone: string, code: string = TEST_OTP): Promise<TypedClient> {
  const client = createAnonClient();
  await requestLoginCode(client, phone);
  await verifyLoginCode(client, phone, code);
  return client;
}
