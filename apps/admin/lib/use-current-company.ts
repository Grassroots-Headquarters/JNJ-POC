"use client";

import { pickCurrentCompany, type CurrentCompanyChoice } from "@jnj/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRememberedCompanyId } from "@/lib/current-company";
import { useIsClient } from "@/lib/use-is-client";
import { useMemberships } from "@/lib/use-memberships";

/**
 * The Company the logged-in User is running right now, for pages below the
 * home. Sends the User to the chooser when they have several Companies and
 * none remembered, and home when they have none.
 */
export function useCurrentCompany() {
  const router = useRouter();
  const memberships = useMemberships();
  const isClient = useIsClient();
  const remembered = isClient ? getRememberedCompanyId() : null;
  const choice: CurrentCompanyChoice | null =
    memberships.isSuccess && isClient ? pickCurrentCompany(memberships.data, remembered) : null;

  useEffect(() => {
    if (choice?.kind === "choose") router.replace("/choose-company");
    if (choice?.kind === "none") router.replace("/");
  }, [choice?.kind, router]);

  return {
    memberships,
    membership: choice?.kind === "chosen" ? choice.membership : null,
    canSwitch: memberships.isSuccess && memberships.data.length > 1,
  };
}
