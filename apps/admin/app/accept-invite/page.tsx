"use client";

import { acceptInvite, inviteStatusLabel, previewInvite, roleLabel } from "@mba/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rememberCompanyId } from "@/lib/current-company";
import { clearPendingInviteCode, getPendingInviteCode } from "@/lib/pending-invite";
import { createClient } from "@/lib/supabase/client";
import { useIsClient } from "@/lib/use-is-client";
import { membershipsQueryKey } from "@/lib/use-memberships";
import { myUserQueryKey, useMyUser } from "@/lib/use-my-user";

/**
 * Accepting an Invite on the web (an invited Admin may do this instead of
 * installing the Mobile app): confirm your name, a trade for Subcontractors,
 * then land on the new Company.
 */
export default function AcceptInvitePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const queryClient = useQueryClient();
  const isClient = useIsClient();
  const code = useMemo(() => (isClient ? getPendingInviteCode() : undefined), [isClient]);

  const preview = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: () => previewInvite(supabase, code!),
    enabled: typeof code === "string",
    retry: false,
  });
  const me = useMyUser();

  const [typedName, setTypedName] = useState<string | null>(null);
  const [trade, setTrade] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prefilled with the Invite's name if the Admin typed one, else the User's own, until edited.
  const fullName = typedName ?? (preview.data?.invitedName || me.data?.fullName || "");

  const unusable =
    code === null ||
    preview.isError ||
    (preview.isSuccess && (preview.data === null || preview.data.status !== "pending"));
  useEffect(() => {
    // A code that cannot be used is forgotten so the home page stops sending people here.
    if (unusable) clearPendingInviteCode();
  }, [unusable]);

  if (code === undefined) return null;
  if (code === null || preview.isError || (preview.isSuccess && preview.data === null)) {
    return (
      <AuthScreen title="My Builder App" caption="Admin app">
        <p className="text-center text-[13px] text-muted-foreground">
          {preview.isError ? preview.error.message : "That Invite link is not valid."}{" "}
          <Link href="/" className="text-primary">
            Go to the app
          </Link>
          .
        </p>
      </AuthScreen>
    );
  }
  if (!preview.isSuccess || !preview.data || !me.isSuccess) {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }
  const invite = preview.data;
  if (invite.status !== "pending") {
    return (
      <AuthScreen title="My Builder App" caption="Admin app">
        <p className="text-center text-[13px] text-muted-foreground">
          This Invite is no longer open ({inviteStatusLabel[invite.status].toLowerCase()}). Ask {invite.companyName} to
          send a new one.{" "}
          <Link href="/" className="text-primary">
            Go to the app
          </Link>
          .
        </p>
      </AuthScreen>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code || !fullName) return;
    setError(null);
    setBusy(true);
    try {
      const companyId = await acceptInvite(supabase, { code, fullName, trade });
      clearPendingInviteCode();
      rememberCompanyId(companyId);
      await queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
      await queryClient.invalidateQueries({ queryKey: myUserQueryKey });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept the Invite.");
      setBusy(false);
    }
  }

  return (
    <AuthScreen title={`Join ${invite.companyName}`} caption={`as ${roleLabel[invite.role]}`}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Label>
          Your name
          <Input
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setTypedName(e.target.value)}
            required
          />
        </Label>
        {invite.role === "subcontractor" && (
          <Label>
            Your trade
            <Input name="trade" placeholder="e.g. Electrician" value={trade} onChange={(e) => setTrade(e.target.value)} />
          </Label>
        )}
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy}>
          Join {invite.companyName}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearPendingInviteCode();
            router.push("/");
          }}
        >
          Not now
        </Button>
      </form>
    </AuthScreen>
  );
}
