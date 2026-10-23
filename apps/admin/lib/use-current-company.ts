"use client";

import { pickCurrentCompany, type Membership } from "@jnj/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRememberedCompanyId } from "@/lib/current-company";
import { useIsClient } from "@/lib/use-is-client";
import { useMemberships } from "@/lib/use-memberships";

export type CurrentCompany =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "none" }
  | { status: "choose" }
  | { status: "ready"; membership: Membership; memberships: Membership[] };

/**
 * The Company the Admin is working in: the remembered choice when it is still
 * one of their Memberships, the only Membership when there is one, otherwise a
 * trip to the Company chooser. RLS still decides what the Company id reaches.
 */
export function useCurrentCompany(): CurrentCompany {
  const router = useRouter();
  const memberships = useMemberships();
  const isClient = useIsClient();
  const remembered = isClient ? getRememberedCompanyId() : null;
  const choice = memberships.isSuccess && isClient ? pickCurrentCompany(memberships.data, remembered) : null;

  useEffect(() => {
    if (choice?.kind === "choose") router.replace("/choose-company");
  }, [choice?.kind, router]);

  if (memberships.isError) return { status: "error", error: memberships.error };
  if (!memberships.isSuccess || !choice) return { status: "loading" };
  if (choice.kind === "choose") return { status: "choose" };
  if (choice.kind === "none") return { status: "none" };
  return { status: "ready", membership: choice.membership, memberships: memberships.data };
}
