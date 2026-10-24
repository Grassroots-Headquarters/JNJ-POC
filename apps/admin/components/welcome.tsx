"use client";

import { canBeJobLead, type Membership } from "@jnj/shared";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CompanyPage } from "@/components/company-page";
import { InviteForm } from "@/components/invite-form";
import { JobForm } from "@/components/job-form";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { invitesQueryKey } from "@/lib/use-invites";
import { useJob } from "@/lib/use-jobs";
import { useMembers } from "@/lib/use-members";

/**
 * The guided first Job, run after Company sign-up: log the Job, then invite
 * the team straight onto it, so it is waiting for them in the Mobile app.
 * The second step lives at /welcome?job=<id> so a reload keeps the place.
 */
export function Welcome({ jobId }: { jobId: string | null }) {
  return (
    <CompanyPage>
      {(membership) =>
        membership.role !== "admin" ? (
          <p className="text-[13px] text-muted-foreground">Only Admins can log Jobs.</p>
        ) : jobId ? (
          <InviteTeam membership={membership} jobId={jobId} />
        ) : (
          <FirstJob membership={membership} />
        )
      }
    </CompanyPage>
  );
}

function Step({ number, title, caption }: { number: 1 | 2; title: string; caption: string }) {
  return (
    <div className="grid gap-1">
      <span className="font-mono text-[11px] tracking-[0.08em] text-[#F59E0B] uppercase">Step {number} of 2</span>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-[13px] text-muted-foreground">{caption}</p>
    </div>
  );
}

function FirstJob({ membership }: { membership: Membership }) {
  const router = useRouter();
  const members = useMembers(membership.companyId);
  const siteTeam = members.data?.filter((m) => canBeJobLead(m.role)) ?? [];
  return (
    <>
      <Step
        number={1}
        title="Log your first Job"
        caption={`${membership.companyName} is set up. Start with the Job you are on now: everyone you put on it sees it in the Mobile app.`}
      />
      <JobForm
        companyId={membership.companyId}
        siteTeam={siteTeam}
        onCreated={(job) => router.replace(`/welcome?job=${job.id}`)}
      />
      <Link href="/" className="text-center text-[13px] text-muted-foreground hover:text-foreground">
        Skip for now
      </Link>
    </>
  );
}

function InviteTeam({ membership, jobId }: { membership: Membership; jobId: string }) {
  const job = useJob(jobId);
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (job.isPending) return <p className="text-muted-foreground">Loading…</p>;
  if (job.isError || !job.data) {
    return (
      <p role="alert" className="text-[13px] text-destructive">
        {job.isError ? job.error.message : "Job not found"}
      </p>
    );
  }
  const theJob = job.data;

  return (
    <>
      <Step
        number={2}
        title={`Invite your team to ${theJob.name}`}
        caption={`Each person gets a text with a link. When they join ${membership.companyName}, ${theJob.name} is waiting for them in the Mobile app.`}
      />
      {toast && <Alert tone="success">{toast}</Alert>}
      {error && <Alert>{error}</Alert>}
      <InviteForm
        companyId={membership.companyId}
        jobId={theJob.id}
        heading="Invite someone to this Job"
        onSent={(mobile) => {
          setError(null);
          setToast(`Invite sent to ${mobile}.`);
          void queryClient.invalidateQueries({ queryKey: invitesQueryKey(membership.companyId) });
        }}
        onError={(message) => {
          setToast(null);
          setError(message);
        }}
      />
      <Link
        href={`/jobs/${theJob.id}`}
        className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 rounded-xl text-[15px] font-semibold" })}
      >
        Done
      </Link>
    </>
  );
}
