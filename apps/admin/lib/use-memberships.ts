"use client";

import { listMyMemberships } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const membershipsQueryKey = ["memberships"] as const;

/** The logged-in User's Memberships, read through RLS as that User. */
export function useMemberships() {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({
    queryKey: membershipsQueryKey,
    queryFn: () => listMyMemberships(supabase),
    retry: false,
  });
}
