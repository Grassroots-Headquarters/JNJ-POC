"use client";

import { formatStartDate, jobAddress, type Job, type Membership } from "@mba/shared";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useJobs } from "@/lib/use-jobs";

/**
 * The Admin demo's Jobs list: every Job of the Company for an Admin, only
 * their own Jobs for anyone else (RLS decides which).
 */
export function JobsList({ membership }: { membership: Membership }) {
  const jobs = useJobs(membership.companyId);
  const isAdmin = membership.role === "admin";

  return (
    <div className="grid gap-3">
      <div className="flex min-h-10 items-center gap-2.5">
        <h1 className="flex-1 text-[17px] font-semibold">Jobs</h1>
        {isAdmin && (
          <Link href="/jobs/new" className="text-[15px] font-semibold text-primary">
            + New job
          </Link>
        )}
      </div>
      {jobs.isPending && <p className="text-[13px] text-muted-foreground">Loading…</p>}
      {jobs.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {jobs.error.message}
        </p>
      )}
      {jobs.isSuccess && jobs.data.length === 0 && (
        <div className="grid gap-3" data-testid="jobs-empty">
          <p className="text-xs text-[#64748B]">
            {isAdmin ? "No jobs here yet." : "No jobs yet. An Admin will assign you to one."}
          </p>
          {isAdmin && (
            <Link
              href="/welcome"
              className={buttonVariants({ size: "lg", className: "h-12 rounded-xl text-[15px] font-semibold" })}
            >
              Log your first Job
            </Link>
          )}
        </div>
      )}
      <ul className="grid gap-3">
        {jobs.data?.map((job) => (
          <li key={job.id}>
            <JobRow job={job} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const starts = formatStartDate(job.startDate);
  const summary = [starts && `Starts ${starts}`, job.jobLead ? `Job lead ${job.jobLead.fullName}` : "No Job lead yet"]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/jobs/${job.id}`}
      data-testid="job"
      className="grid gap-1 rounded-[14px] border border-border bg-secondary p-3.5 text-left hover:border-primary/50"
    >
      <b className="font-semibold">{job.name}</b>
      <span className="text-[13px] text-muted-foreground">{jobAddress(job)}</span>
      <span className="text-[13px] text-muted-foreground">{summary}</span>
    </Link>
  );
}
