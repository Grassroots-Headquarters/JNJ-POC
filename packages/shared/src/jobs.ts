import type { TypedClient } from "./client";
import type { Member } from "./members";
import { roleLabel, type Role } from "./memberships";

/** A Job as both apps list it. */
export type Job = {
  id: string;
  companyId: string;
  name: string;
  /** Null until the Admin knows it; show `jobAddress(job)`. */
  address: string | null;
  /** ISO date (YYYY-MM-DD), or null when not yet known. */
  startDate: string | null;
  /** Null when nobody is marked Job lead, or the caller cannot see who is. */
  jobLead: { userId: string; fullName: string } | null;
};

/** Someone on a Job, as its People section shows them. */
export type JobPerson = {
  userId: string;
  fullName: string;
  /** The Role in the Job's Company; null for the Job's Client, who holds no Membership. */
  role: Role | null;
  /** A Subcontractor's trade; null for everyone else. */
  trade: string | null;
  isJobLead: boolean;
};

export type CreateJobInput = {
  companyId: string;
  name: string;
  address?: string | null;
  /** ISO date (YYYY-MM-DD); blank means not yet known. */
  startDate?: string | null;
};

const JOB_COLUMNS = "id, company_id, name, address, start_date, assignments(user_id, is_job_lead, profiles(full_name))";

type JobRow = {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  start_date: string | null;
  assignments: { user_id: string; is_job_lead: boolean; profiles: { full_name: string } | null }[];
};

function toJob(row: JobRow): Job {
  const lead = row.assignments.find((a) => a.is_job_lead);
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    address: row.address,
    startDate: row.start_date,
    jobLead: lead ? { userId: lead.user_id, fullName: lead.profiles?.full_name ?? "" } : null,
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The Company's Jobs the caller can see, newest first: every Job for an
 * Admin, only the Jobs they are assigned to for anyone else (RLS decides).
 */
export async function listJobs(client: TypedClient, companyId: string): Promise<Job[]> {
  const { data, error } = await client
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(toJob);
}

/** One Job, or null when it does not exist or the caller cannot see it. */
export async function getJob(client: TypedClient, jobId: string): Promise<Job | null> {
  const { data, error } = await client.from("jobs").select(JOB_COLUMNS).eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toJob(data) : null;
}

/** Logs a Job (Admins only). Blank address and start date are stored as not yet known. */
export async function createJob(client: TypedClient, input: CreateJobInput): Promise<Job> {
  const { data, error } = await client
    .from("jobs")
    .insert({
      company_id: input.companyId,
      name: input.name.trim(),
      address: blankToNull(input.address),
      start_date: blankToNull(input.startDate),
    })
    .select(JOB_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toJob(data);
}

/** The Job's address, or "Address to follow" while the Admin does not know it. */
export function jobAddress(job: Pick<Job, "address">): string {
  return job.address ?? "Address to follow";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-02" as "2 Nov 2026"; read from the string so no time zone can shift the day. */
export function formatStartDate(startDate: string | null): string | null {
  if (!startDate) return null;
  const [year, month, day] = startDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "Site team · Job lead", "Subcontractor · Electrician", "Admin", or "Client". */
export function jobPersonLabel(person: Pick<JobPerson, "role" | "trade" | "isJobLead">): string {
  if (!person.role) return "Client";
  const detail = person.isJobLead ? "Job lead" : person.role === "subcontractor" ? person.trade : null;
  return detail ? `${roleLabel[person.role]} · ${detail}` : roleLabel[person.role];
}

/** Only a Site team member can be Job lead. */
export function canBeJobLead(role: Role | null): boolean {
  return role === "site_team";
}

/** The Company's Members who are not on the Job yet. */
export function peopleToAssign(members: Member[], people: Pick<JobPerson, "userId">[]): Member[] {
  const onJob = new Set(people.map((p) => p.userId));
  return members.filter((m) => !onJob.has(m.userId));
}

/** Job lead first, then Members by name, then the Client. */
export function sortJobPeople(people: JobPerson[]): JobPerson[] {
  const rank = (p: JobPerson) => (p.isJobLead ? 0 : p.role ? 1 : 2);
  return [...people].sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName));
}

/** The people on a Job the caller can see, with their Role in the Job's Company. */
export async function listJobPeople(client: TypedClient, job: { id: string; companyId: string }): Promise<JobPerson[]> {
  const { data: assignments, error } = await client
    .from("assignments")
    .select("user_id, is_job_lead, profiles(full_name)")
    .eq("job_id", job.id);
  if (error) throw new Error(error.message);
  if (assignments.length === 0) return [];

  const { data: memberships, error: membershipsError } = await client
    .from("memberships")
    .select("user_id, role, trade")
    .eq("company_id", job.companyId)
    .in(
      "user_id",
      assignments.map((a) => a.user_id),
    );
  if (membershipsError) throw new Error(membershipsError.message);
  const byUser = new Map(memberships.map((m) => [m.user_id, m]));

  return sortJobPeople(
    assignments.map((a) => {
      const membership = byUser.get(a.user_id);
      return {
        userId: a.user_id,
        fullName: (a.profiles as { full_name: string } | null)?.full_name ?? "",
        role: membership?.role ?? null,
        trade: membership?.trade ?? null,
        isJobLead: a.is_job_lead,
      };
    }),
  );
}

/**
 * Puts a Member on a Job, or changes their Job lead flag if already on it
 * (Admins only). Marking a new Job lead takes the flag from the old one.
 */
export async function assignToJob(
  client: TypedClient,
  input: { jobId: string; userId: string; jobLead?: boolean },
): Promise<void> {
  const { error } = await client.rpc("assign_to_job", {
    job: input.jobId,
    user_id: input.userId,
    job_lead: input.jobLead ?? false,
  });
  if (error) throw new Error(error.message);
}

/** Takes someone off a Job (Admins only). It disappears for them on their next query. */
export async function unassignFromJob(client: TypedClient, input: { jobId: string; userId: string }): Promise<void> {
  const { error } = await client.rpc("unassign_from_job", { job: input.jobId, user_id: input.userId });
  if (error) throw new Error(error.message);
}
