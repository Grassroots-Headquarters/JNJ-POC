"use client";

import {
  assignToJob,
  canBeJobLead,
  formatStartDate,
  inviteStatusLabel,
  jobAddress,
  jobPersonLabel,
  peopleToAssign,
  roleLabel,
  unassignFromJob,
  type Job,
  type JobPerson,
  type Membership,
} from "@jnj/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { CompanyPage, SectionHeading } from "@/components/company-page";
import { InviteForm, selectClass } from "@/components/invite-form";
import { Pill } from "@/components/pill";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { invitesQueryKey, useInvites } from "@/lib/use-invites";
import { jobPeopleQueryKey, jobQueryKey, jobsQueryKey, useJob, useJobPeople } from "@/lib/use-jobs";
import { useMembers } from "@/lib/use-members";

/** /jobs/<id>: a Job's details and People. Admins assign people and mark the Job lead here. */
export function JobPage({ jobId, justCreated }: { jobId: string; justCreated: boolean }) {
  return <CompanyPage>{(membership) => <JobContent membership={membership} jobId={jobId} justCreated={justCreated} />}</CompanyPage>;
}

function JobContent({ membership, jobId, justCreated }: { membership: Membership; jobId: string; justCreated: boolean }) {
  const job = useJob(jobId);

  const back = (
    <Link href="/" className="text-[15px] font-medium text-primary">
      ‹ Jobs
    </Link>
  );
  if (job.isPending) return <p className="text-muted-foreground">Loading…</p>;
  // A Job of another Company, or one the User is not on, reads the same as no Job at all.
  if (job.isError || !job.data || job.data.companyId !== membership.companyId) {
    return (
      <div className="grid gap-3">
        <div className="flex min-h-10 items-center gap-2.5">{back}</div>
        <p role="alert" className="text-[15px] font-medium">
          Job not found
        </p>
        <p className="text-[13px] text-muted-foreground">
          {job.isError ? job.error.message : `It may have been removed, or it belongs to a Job you are not on.`}
        </p>
      </div>
    );
  }
  const theJob = job.data;
  const starts = formatStartDate(theJob.startDate);
  const isAdmin = membership.role === "admin";

  return (
    <>
      <div className="flex min-h-10 items-center gap-2.5">
        {back}
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{theJob.name}</h1>
      </div>
      {justCreated && (
        <Alert tone="success">
          {theJob.name} created.{theJob.jobLead ? ` ${theJob.jobLead.fullName} can see it now.` : ""}
        </Alert>
      )}
      <div className="grid gap-1 rounded-[14px] border border-border bg-secondary p-3.5" data-testid="job-details">
        <b className="font-semibold">{jobAddress(theJob)}</b>
        <span className="text-[13px] text-muted-foreground">{starts ? `Starts ${starts}` : "Start date to follow"}</span>
      </div>
      <People job={theJob} isAdmin={isAdmin} />
    </>
  );
}

function People({ job, isAdmin }: { job: Job; isAdmin: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const people = useJobPeople(job);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: jobPeopleQueryKey(job.id) });
    void queryClient.invalidateQueries({ queryKey: jobQueryKey(job.id) });
    void queryClient.invalidateQueries({ queryKey: jobsQueryKey(job.companyId) });
    void queryClient.invalidateQueries({ queryKey: invitesQueryKey(job.companyId) });
  }
  function done(message: string) {
    setError(null);
    setToast(message);
    refresh();
  }
  function fail(e: unknown, fallback: string) {
    setToast(null);
    setError(e instanceof Error ? e.message : fallback);
  }

  const makeLead = useMutation({
    mutationFn: (person: JobPerson) => assignToJob(supabase, { jobId: job.id, userId: person.userId, jobLead: true }),
    onSuccess: (_, person) => done(`${person.fullName || "They"} is now the Job lead.`),
    onError: (e) => fail(e, "Could not change the Job lead."),
  });
  const remove = useMutation({
    mutationFn: (person: JobPerson) => unassignFromJob(supabase, { jobId: job.id, userId: person.userId }),
    onSuccess: (_, person) => done(`${person.fullName || "That person"} is off ${job.name}.`),
    onError: (e) => fail(e, "Could not take them off the Job."),
  });

  return (
    <>
      {toast && <Alert tone="success">{toast}</Alert>}
      {error && <Alert>{error}</Alert>}
      <section className="grid gap-2.5" aria-labelledby="job-people-heading">
        <SectionHeading id="job-people-heading">People</SectionHeading>
        {people.isPending && <p className="text-[13px] text-muted-foreground">Loading…</p>}
        {people.isError && (
          <p role="alert" className="text-[13px] text-destructive">
            {people.error.message}
          </p>
        )}
        {people.isSuccess && people.data.length === 0 && (
          <p className="text-xs text-[#64748B]">Nobody is on this Job yet.</p>
        )}
        <ul className="grid gap-2.5">
          {people.data?.map((person) => (
            <li
              key={person.userId}
              className="grid gap-2 rounded-[14px] border border-border bg-secondary p-3.5"
              data-testid="job-person"
            >
              <div className="flex items-center justify-between gap-2">
                <b className="font-semibold">{person.fullName || "Name to follow"}</b>
                <Pill tone={person.isJobLead ? "lead" : undefined}>{jobPersonLabel(person)}</Pill>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  {canBeJobLead(person.role) && !person.isJobLead && (
                    <Button type="button" disabled={makeLead.isPending} onClick={() => makeLead.mutate(person)}>
                      Make Job lead
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Take ${person.fullName || "this person"} off ${job.name}?`)) remove.mutate(person);
                    }}
                  >
                    Remove from Job
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      {isAdmin && (
        <>
          <InvitedToJob job={job} />
          <AssignForm job={job} people={people.data ?? []} onAssigned={done} onError={(e) => fail(e, "Could not assign.")} />
          <InviteForm
            companyId={job.companyId}
            jobId={job.id}
            heading="Invite someone to this Job"
            onSent={(mobile) => done(`Invite sent to ${mobile}.`)}
            onError={(message) => fail(new Error(message), message)}
          />
        </>
      )}
    </>
  );
}

/** Pending Invites that put their invitee on this Job when accepted. */
function InvitedToJob({ job }: { job: Job }) {
  const invites = useInvites(job.companyId);
  const pending = invites.data?.filter((i) => i.jobId === job.id && i.status === "pending") ?? [];
  if (pending.length === 0) return null;
  return (
    <section className="grid gap-2.5" aria-labelledby="job-invites-heading">
      <SectionHeading id="job-invites-heading">Invited to this Job</SectionHeading>
      <ul className="grid gap-2.5">
        {pending.map((invite) => (
          <li
            key={invite.id}
            className="grid gap-1 rounded-[14px] border border-border bg-secondary p-3.5"
            data-testid="job-invite"
          >
            <div className="flex items-center justify-between gap-2">
              <b className="font-semibold">{invite.fullName || invite.phone}</b>
              <Pill tone={invite.status}>{inviteStatusLabel[invite.status]}</Pill>
            </div>
            <span className="text-[13px] text-muted-foreground">
              {roleLabel[invite.role]} · {invite.phone}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssignForm({
  job,
  people,
  onAssigned,
  onError,
}: {
  job: Job;
  people: JobPerson[];
  onAssigned: (message: string) => void;
  onError: (e: unknown) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const members = useMembers(job.companyId);
  const available = peopleToAssign(members.data ?? [], people);
  const [userId, setUserId] = useState("");
  const [lead, setLead] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = available.find((m) => m.userId === userId);
  const leadAllowed = canBeJobLead(chosen?.role ?? null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!chosen) return;
    setBusy(true);
    try {
      const asLead = lead && leadAllowed;
      await assignToJob(supabase, { jobId: job.id, userId: chosen.userId, jobLead: asLead });
      onAssigned(`${chosen.fullName || "They"} ${asLead ? "is the Job lead" : "is on the Job"} and can see ${job.name} now.`);
      setUserId("");
      setLead(false);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  if (members.isSuccess && available.length === 0) return null;
  return (
    <section className="grid gap-2.5" aria-labelledby="assign-heading">
      <SectionHeading id="assign-heading">Assign someone</SectionHeading>
      <form onSubmit={onSubmit} className="grid gap-2.5">
        <label className="grid gap-1.5 text-[13px] text-muted-foreground">
          Person
          <select className={selectClass} value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Choose someone</option>
            {available.map((m) => (
              <option key={m.userId} value={m.userId}>
                {`${m.fullName || "Name to follow"} (${roleLabel[m.role]})`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={lead && leadAllowed}
            disabled={!leadAllowed}
            onChange={(e) => setLead(e.target.checked)}
          />
          Job lead
        </label>
        <span className="text-xs text-[#64748B]">Only a Site team member can be Job lead.</span>
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy || !chosen}>
          Assign
        </Button>
      </form>
    </section>
  );
}
