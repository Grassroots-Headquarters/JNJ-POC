import { getMyUser, listJobs, listMyMemberships } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";

import { getRememberedCompanyId } from "@/lib/current-company";
import { supabase } from "@/lib/supabase";

export const membershipsQueryKey = ["memberships"] as const;
export const myUserQueryKey = ["my-user"] as const;
export const rememberedCompanyQueryKey = ["remembered-company"] as const;

export function useMemberships() {
  return useQuery({ queryKey: membershipsQueryKey, queryFn: () => listMyMemberships(supabase), retry: false });
}

/** The logged-in User's own details. */
export function useMyUser(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: myUserQueryKey, queryFn: () => getMyUser(supabase), retry: false, ...options });
}

export function useRememberedCompanyId() {
  return useQuery({ queryKey: rememberedCompanyQueryKey, queryFn: getRememberedCompanyId, staleTime: Infinity });
}

export const jobsQueryKey = (companyId: string) => ["jobs", companyId] as const;

/** The Company's Jobs this User can see: only the ones they are assigned to, unless they are an Admin. */
export function useJobs(companyId: string) {
  return useQuery({ queryKey: jobsQueryKey(companyId), queryFn: () => listJobs(supabase, companyId), retry: false });
}
