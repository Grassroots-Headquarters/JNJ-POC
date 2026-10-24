"use client";

import type { Membership } from "@mba/shared";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { useCurrentCompany } from "@/lib/use-current-company";

/**
 * A logged-in page inside the current Company: the header, then the page's
 * own content for that Membership. Loading, errors and the trip to the
 * Company chooser are handled here.
 */
export function CompanyPage({ children }: { children: (membership: Membership) => ReactNode }) {
  const { memberships, membership, canSwitch } = useCurrentCompany();

  if (memberships.isError) {
    return (
      <main className="p-6" role="alert">
        <p className="font-medium text-destructive">Could not load your Companies</p>
        <p className="text-sm text-muted-foreground">{memberships.error.message}</p>
      </main>
    );
  }
  // Loading, or on the way to the chooser or home.
  if (!membership) return <main className="p-6 text-muted-foreground">Loading…</main>;

  return (
    <>
      <AppHeader current={membership} canSwitch={canSwitch} />
      <main className="mx-auto grid w-full max-w-[640px] content-start gap-6 p-6">{children(membership)}</main>
    </>
  );
}

/** Demo `.h3`: a small uppercase section heading. */
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
      {children}
    </h2>
  );
}
