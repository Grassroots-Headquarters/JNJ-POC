import { inviteCodeFromSms } from "@jnj/shared";
import { createServiceClient } from "./clients";

/**
 * The last SMS the fake outbox (`outbound_sms`) recorded for an E.164 number,
 * read as the test harness, not as a User. Null when none was sent.
 */
export async function lastSmsTo(phone: string): Promise<{ to: string; body: string } | null> {
  const { data, error } = await createServiceClient()
    .from("outbound_sms")
    .select("to, body")
    .eq("to", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** The Invite code in the last SMS texted to an E.164 number. */
export async function inviteCodeTextedTo(phone: string): Promise<string> {
  const sms = await lastSmsTo(phone);
  if (!sms) throw new Error(`No SMS was sent to ${phone}`);
  const code = inviteCodeFromSms(sms.body);
  if (!code) throw new Error(`No Invite link in the SMS: ${sms.body}`);
  return code;
}

/** The id of the auth user with this E.164 number, if they have logged in yet. */
export async function userIdForPhone(phone: string): Promise<string | undefined> {
  const { data, error } = await createServiceClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  return data.users.find((u) => u.phone === phone.replace(/^\+/, ""))?.id;
}
