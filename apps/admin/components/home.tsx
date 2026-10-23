"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { ConnectedCard } from "@/components/connected-card";
import { Button } from "@/components/ui/button";
import { getPendingInviteCode } from "@/lib/pending-invite";
import { createClient } from "@/lib/supabase/client";
import { useCurrentCompany } from "@/lib/use-current-company";
import { useIsClient } from "@/lib/use-is-client";

/** The logged-in home: picks up a waiting Invite, works out the current Company, then shows it. */
export function Home() {
  const router = useRouter();
  const isClient = useIsClient();
  const pendingInvite = isClient ? getPendingInviteCode() : null;
  const current = useCurrentCompany();

  useEffect(() => {
    if (pendingInvite) router.replace("/accept-invite");
  }, [pendingInvite, router]);

  if (pendingInvite) return null;
  if (current.status === "loading" || current.status === "choose") {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }
  if (current.status === "error") {
    return (
      <main className="p-6" role="alert">
        <p className="font-medium text-destructive">Could not load your Companies</p>
        <p className="text-sm text-muted-foreground">{current.error.message}</p>
      </main>
    );
  }

  if (current.status === "none") {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="grid max-w-[390px] gap-3 text-center">
          <h1 className="text-xl font-semibold">You are not part of a Company yet</h1>
          <p className="text-[13px] text-muted-foreground">
            Sign your own Company up, or ask your office to invite you.
          </p>
          <Button render={<Link href="/sign-up" />} size="lg">
            Sign your Company up
          </Button>
          <LogOutLink />
        </div>
      </main>
    );
  }

  return (
    <>
      <AppHeader current={current.membership} canSwitch={current.memberships.length > 1} />
      <main className="flex flex-1 items-center justify-center p-6">
        <ConnectedCard />
      </main>
    </>
  );
}

function LogOutLink() {
  const router = useRouter();
  const queryClient = useQueryClient();
  async function logOut() {
    await createClient().auth.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }
  return (
    <Button type="button" variant="outline" onClick={logOut}>
      Log out
    </Button>
  );
}
