import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { serve } from "../_shared/sentry.ts";

// Texts an Invite to the invited mobile number. Called by the Admin app right
// after create_invite or resend_invite, with the Admin's JWT:
//   POST /functions/v1/send-invite  { "inviteId": "<uuid>" }
// The Invite is read under the caller's token, so RLS decides: only an Admin
// of the Invite's Company sees the row; everyone else gets 403.
// With TWILIO_ACCOUNT_SID set the SMS goes through Twilio Messaging; without
// it (local, CI) the message is recorded in outbound_sms for tests to read.

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  site_team: "Site team",
  subcontractor: "Subcontractor",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Log in first" }, 401);

  let inviteId: unknown;
  try {
    ({ inviteId } = await request.json());
  } catch {
    return json({ error: "inviteId is required" }, 400);
  }
  if (typeof inviteId !== "string" || inviteId === "") return json({ error: "inviteId is required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: invite, error } = await asCaller
    .from("invites")
    .select("id, code, phone, role, accepted_at, cancelled_at, companies(name)")
    .eq("id", inviteId)
    .maybeSingle();
  if (error) {
    // PostgREST refuses a bad or expired token before RLS gets a say.
    const status = error.code === "PGRST301" || /jwt/i.test(error.message) ? 401 : 500;
    return json({ error: error.message }, status);
  }
  if (!invite) return json({ error: "Only an Admin of the Invite's Company can send it" }, 403);
  if (invite.accepted_at || invite.cancelled_at) return json({ error: "This Invite is no longer pending" }, 409);

  const company = invite.companies as unknown as { name: string } | null;
  const baseUrl = (Deno.env.get("INVITE_LINK_BASE_URL") || "https://app.example.com").replace(/\/$/, "");
  const body =
    `${company?.name ?? "A Company"} has invited you to the JNJ Site App as ${ROLE_LABEL[invite.role] ?? invite.role}. ` +
    `Open ${baseUrl}/invite/${invite.code}`;

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  if (twilioAccountSid) {
    await sendWithTwilio(twilioAccountSid, invite.phone, body);
    return json({ ok: true, delivery: "twilio" });
  }

  const asService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: recordError } = await asService.from("outbound_sms").insert({ to: invite.phone, body });
  if (recordError) throw new Error(`Could not record the SMS: ${recordError.message}`);
  return json({ ok: true, delivery: "recorded" });
});

async function sendWithTwilio(accountSid: string, to: string, body: string): Promise<void> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, Body: body, MessagingServiceSid: messagingServiceSid }),
  });
  if (!response.ok) {
    throw new Error(`Twilio refused the SMS: ${response.status} ${await response.text()}`);
  }
}
