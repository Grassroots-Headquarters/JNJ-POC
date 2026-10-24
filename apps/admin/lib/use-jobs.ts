"use client";

import { getJob, listJobPeople, listJobs, type Job } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const jobsQueryKey = (companyId: string) => ["jobs", companyId] as const;
export const jobQueryKey = (jobId: string) => ["job", jobId] as const;
export const jobPeopleQueryKey = (jobId: string) => ["job-people", jobId] as const;

/** The Company's Jobs the logged-in User can see: all of them for an Admin. */
export function useJobs(companyId: string) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({ queryKey: jobsQueryKey(companyId), queryFn: () => listJobs(supabase, companyId), retry: false });
}

/** One Job; null when it does not exist or is not the caller's to see. */
export function useJob(jobId: string) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({ queryKey: jobQueryKey(jobId), queryFn: () => getJob(supabase, jobId), retry: false });
}

export function useJobPeople(job: Job) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({
    queryKey: jobPeopleQueryKey(job.id),
    queryFn: () => listJobPeople(supabase, job),
    retry: false,
  });
}
