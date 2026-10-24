import { inviteStatusLabel, previewInvite, roleLabel } from "@mba/shared";
import Link from "next/link";
import { RememberInviteCode } from "@/components/remember-invite-code";
import { createClient } from "@/lib/supabase/server";

// Placeholders until the apps are in the stores (spec: Accounts and identity).
const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.grassrootshq.jnjsite";

/**
 * The fallback for an Invite link when the Mobile app is not installed: what
 * the Invite is for, the store buttons, and a way into the app or the Admin
 * app once logged in. Server-rendered through invite_preview, which never
 * returns the invited phone.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const preview = await previewInvite(supabase, code);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="grid w-full max-w-[390px] gap-4 rounded-[28px] border border-border bg-card p-6 text-center">
        <p className="text-xs text-[#64748B]">JNJ Site App</p>
        {preview === null && (
          <>
            <h1 className="text-xl font-semibold">This Invite link is not valid</h1>
            <p className="text-[13px] text-muted-foreground">Ask the person who invited you to send it again.</p>
          </>
        )}
        {preview !== null && preview.status !== "pending" && (
          <>
            <h1 className="text-xl font-semibold">This Invite is no longer open</h1>
            <p className="text-[13px] text-muted-foreground">
              {inviteStatusLabel[preview.status]}: ask {preview.companyName} to send a new one.
            </p>
          </>
        )}
        {preview !== null && preview.status === "pending" && (
          <>
            <RememberInviteCode code={code} />
            <h1 className="text-xl font-semibold" data-testid="invite-company">
              {preview.companyName} has invited you
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Join as <b className="text-foreground">{roleLabel[preview.role]}</b>. Get the Mobile app, log in with
              your mobile number and the Invite is picked up.
            </p>
            <div className="grid gap-2.5">
              <a
                href={APP_STORE_URL}
                className="rounded-xl bg-primary p-3.5 text-[15px] font-semibold text-primary-foreground"
                data-testid="app-store"
              >
                Download on the App Store
              </a>
              <a
                href={GOOGLE_PLAY_URL}
                className="rounded-xl bg-primary p-3.5 text-[15px] font-semibold text-primary-foreground"
                data-testid="google-play"
              >
                Get it on Google Play
              </a>
              <a
                href={`jnjsite://invite/${code}`}
                className="rounded-[10px] border border-border px-3 py-2 text-[13px] font-medium"
                data-testid="open-in-app"
              >
                Open in the app
              </a>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Already have the app? Log in and the Invite is picked up. Admins can also{" "}
              <Link href="/login" className="text-primary">
                log in here
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
