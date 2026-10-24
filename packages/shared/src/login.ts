import type { TypedClient } from "./client";

export const WRONG_CODE_MESSAGE = "That code is wrong or has expired. Send a new code and try again.";

/** Ask Supabase to text a login code to a phone number in E.164 form. */
export async function requestLoginCode(client: TypedClient, phone: string, fullName?: string): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    phone,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  });
  if (error) throw new Error(error.message);
}

/** Exchange the texted code for a session. Throws with a message fit to show. */
export async function verifyLoginCode(client: TypedClient, phone: string, code: string): Promise<void> {
  const { error } = await client.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw new Error(loginCodeErrorMessage(error));
}

/** Turn Supabase's wording for a bad code into the message the apps show. */
export function loginCodeErrorMessage(error: { message: string }): string {
  if (/expired|invalid|incorrect/i.test(error.message)) return WRONG_CODE_MESSAGE;
  return error.message;
}
