"use client";

import { canBeJobLead } from "@jnj/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompanyPage } from "@/components/company-page";
import { JobForm } from "@/components/job-form";
import { useMembers } from "@/lib/use-members";

/** /jobs/new: the Admin demo's "New job" screen. */
export function NewJob() {
  return (
    <CompanyPage>
      {(membership) => (
        <>
          <div className="flex min-h-10 items-center gap-2.5">
            <Link href="/" className="text-[15px] font-medium text-primary">
              Cancel
            </Link>
            <h1 className="text-[17px] font-semibold">New job</h1>
          </div>
          {membership.role === "admin" ? (
            <NewJobForm companyId={membership.companyId} />
          ) : (
            <p className="text-[13px] text-muted-foreground">Only Admins can log Jobs.</p>
          )}
        </>
      )}
    </CompanyPage>
  );
}

function NewJobForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const members = useMembers(companyId);
  const siteTeam = members.data?.filter((m) => canBeJobLead(m.role)) ?? [];
  return <JobForm companyId={companyId} siteTeam={siteTeam} onCreated={(job) => router.push(`/jobs/${job.id}?created=1`)} />;
}
