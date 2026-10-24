import { getMyProfile, listJobs, listMyMemberships } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";

import { getRememberedCompanyId } from "@/lib/current-company";
import { supabase } from "@/lib/supabase";

export const membershipsQueryKey = ["memberships"] as const;
export const profileQueryKey = ["profile"] as const;
export const rememberedCompanyQueryKey = ["rememberedCompany"] as const;

export function useMemberships() {
  return useQuery({ queryKey: membershipsQueryKey, queryFn: () => listMyMemberships(supabase), retry: false });
}

export function useMyProfile() {
  return useQuery({ queryKey: profileQueryKey, queryFn: () => getMyProfile(supabase), retry: false });
}

export function useRememberedCompanyId() {
  return useQuery({ queryKey: rememberedCompanyQueryKey, queryFn: getRememberedCompanyId, staleTime: Infinity });
}

export const jobsQueryKey = (companyId: string) => ["jobs", companyId] as const;

/** The Company's Jobs this User can see: only the ones they are assigned to, unless they are an Admin. */
export function useJobs(companyId: string) {
  return useQuery({ queryKey: jobsQueryKey(companyId), queryFn: () => listJobs(supabase, companyId), retry: false });
}
