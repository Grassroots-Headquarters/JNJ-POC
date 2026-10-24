"use client";

import { getMyUser } from "@mba/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const myUserQueryKey = ["my-user"] as const;

/** The logged-in User's own details. */
export function useMyUser() {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({ queryKey: myUserQueryKey, queryFn: () => getMyUser(supabase), retry: false });
}
