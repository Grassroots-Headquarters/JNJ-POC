"use client";

import { listInvites } from "@mba/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const invitesQueryKey = (companyId: string) => ["invites", companyId] as const;

/** The Company's Invites, newest first. RLS shows them to the Company's Admins only. */
export function useInvites(companyId: string) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({ queryKey: invitesQueryKey(companyId), queryFn: () => listInvites(supabase, companyId), retry: false });
}
