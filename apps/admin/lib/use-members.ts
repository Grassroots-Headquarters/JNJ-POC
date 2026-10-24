"use client";

import { listMembers } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const membersQueryKey = (companyId: string) => ["members", companyId] as const;

/** The Company's Members with their Role, read through RLS as the logged-in User. */
export function useMembers(companyId: string) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({ queryKey: membersQueryKey(companyId), queryFn: () => listMembers(supabase, companyId), retry: false });
}
