"use client";

import { pickCurrentCompany } from "@jnj/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { ConnectedCard } from "@/components/connected-card";
import { Button } from "@/components/ui/button";
import { getRememberedCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/client";
import { useIsClient } from "@/lib/use-is-client";
import { useMemberships } from "@/lib/use-memberships";

/** The logged-in home: works out the current Company, then shows it. */
export function Home() {
  const router = useRouter();
  const memberships = useMemberships();
  const isClient = useIsClient();
  const remembered = isClient ? getRememberedCompanyId() : null;

  const choice = memberships.isSuccess && isClient ? pickCurrentCompany(memberships.data, remembered) : null;

  useEffect(() => {
    if (choice?.kind === "choose") router.replace("/choose-company");
  }, [choice?.kind, router]);

  if (memberships.isPending) return <main className="p-6 text-muted-foreground">Loading…</main>;
  if (memberships.isError) {
    return (
      <main className="p-6" role="alert">
        <p className="font-medium text-destructive">Could not load your Companies</p>
        <p className="text-sm text-muted-foreground">{memberships.error.message}</p>
      </main>
    );
  }
  if (!choice || choice.kind === "choose") return null;

  if (choice.kind === "none") {
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
      <AppHeader current={choice.membership} canSwitch={memberships.data.length > 1} />
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
