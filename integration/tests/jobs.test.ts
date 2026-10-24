import {
  COMPANY_A,
  COMPANY_B,
  JOB_A as OVERBURY,
  JOB_B as HART_LANE,
  TEST_USERS,
  TEST_USER_IDS,
  createServiceClient,
  freeTestPhone,
  signInAs,
} from "@jnj/harness";
import {
  acceptInvite,
  assignToJob,
  createInvite,
  createJob,
  getJob,
  listJobPeople,
  listJobs,
  unassignFromJob,
  type Job,
  type TypedClient,
} from "@jnj/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Free test numbers for ticket #29 are 013-015. Playwright uses 013 and 014;
// these tests use 015 for a person invited straight onto a Job.
const JOE = freeTestPhone(15);

describe("Logging a Job and assigning people", () => {
  let alex: TypedClient;
  let sam: TypedClient;
  let bea: TypedClient;
  let job: Job;

  beforeAll(async () => {
    [alex, sam, bea] = await Promise.all([
      signInAs(TEST_USERS.alexAdmin),
      signInAs(TEST_USERS.samSite),
      signInAs(TEST_USERS.beaBoss),
    ]);
  });

  afterAll(async () => {
    // Leave Company A as seeded so other suites (and Playwright) see Sam on no Job.
    if (job) await createServiceClient().from("jobs").delete().eq("id", job.id);
  });

  it("lets an Admin log a Job, which the Admin then sees with every other Job of the Company", async () => {
    job = await createJob(alex, {
      companyId: COMPANY_A.id,
      name: "  Integration Close  ",
      address: "1 Integration Close, Bromley",
      startDate: "2026-11-02",
    });

    expect(job).toMatchObject({
      companyId: COMPANY_A.id,
      name: "Integration Close",
      address: "1 Integration Close, Bromley",
      startDate: "2026-11-02",
      jobLead: null,
    });
    const names = (await listJobs(alex, COMPANY_A.id)).map((j) => j.name);
    expect(names).toEqual(expect.arrayContaining(["Integration Close", OVERBURY.name]));
    expect(names).not.toContain(HART_LANE.name);
  });

  it("keeps a blank address as 'to follow' rather than storing an empty one", async () => {
    const noAddress = await createJob(alex, { companyId: COMPANY_A.id, name: "No address yet", address: "  " });
    try {
      expect(noAddress.address).toBeNull();
      expect(noAddress.startDate).toBeNull();
    } finally {
      await createServiceClient().from("jobs").delete().eq("id", noAddress.id);
    }
  });

  it("refuses a Job from someone who is not an Admin of the Company", async () => {
    await expect(createJob(sam, { companyId: COMPANY_A.id, name: "Sam's job" })).rejects.toThrow();
    await expect(createJob(bea, { companyId: COMPANY_A.id, name: "Bea's job" })).rejects.toThrow();
  });

  it("shows a Site team member only the Jobs they are assigned to, appearing and disappearing with the Assignment", async () => {
    expect(await listJobs(sam, COMPANY_A.id)).toEqual([]);

    await assignToJob(alex, { jobId: job.id, userId: TEST_USER_IDS.samSite, jobLead: true });
    const samsJobs = await listJobs(sam, COMPANY_A.id);
    expect(samsJobs.map((j) => j.id)).toEqual([job.id]);
    expect(samsJobs[0].jobLead).toEqual({ userId: TEST_USER_IDS.samSite, fullName: "Sam Site" });

    await unassignFromJob(alex, { jobId: job.id, userId: TEST_USER_IDS.samSite });
    expect(await listJobs(sam, COMPANY_A.id)).toEqual([]);
    expect(await getJob(sam, job.id)).toBeNull();
  });

  it("lists the people on a Job with their Role, Job lead first, and the Client last", async () => {
    const people = await listJobPeople(alex, OVERBURY);
    expect(people).toEqual([
      { userId: TEST_USER_IDS.deeDual, fullName: "Dee Dual", role: "site_team", trade: null, isJobLead: true },
      { userId: TEST_USER_IDS.cleoClient, fullName: "Cleo Client", role: null, trade: null, isJobLead: false },
    ]);
  });

  it("only lets a Site team member be Job lead", async () => {
    await expect(assignToJob(alex, { jobId: job.id, userId: TEST_USER_IDS.alexAdmin, jobLead: true })).rejects.toThrow(
      "Only a Site team member can be Job lead",
    );
  });

  it("keeps another Company's Admin away from the Job and its Assignments", async () => {
    expect((await listJobs(bea, COMPANY_A.id)).length).toBe(0);
    expect(await getJob(bea, job.id)).toBeNull();
    expect(await listJobPeople(bea, OVERBURY)).toEqual([]);
    await expect(assignToJob(bea, { jobId: job.id, userId: TEST_USER_IDS.beaBoss })).rejects.toThrow("Job not found");
    await expect(unassignFromJob(bea, { jobId: OVERBURY.id, userId: TEST_USER_IDS.deeDual })).rejects.toThrow(
      "Job not found",
    );
    // Bea still sees her own Company's Job.
    expect((await listJobs(bea, COMPANY_B.id)).map((j) => j.name)).toEqual([HART_LANE.name]);
  });
});

describe("Inviting someone straight onto a Job", () => {
  let alex: TypedClient;
  let job: Job;

  beforeAll(async () => {
    alex = await signInAs(TEST_USERS.alexAdmin);
    const service = createServiceClient();
    await service.from("invites").delete().eq("phone", JOE);
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    const joe = data.users.find((u) => u.phone === JOE.slice(1));
    if (joe) await service.from("memberships").delete().eq("user_id", joe.id);
    job = await createJob(alex, { companyId: COMPANY_A.id, name: "Invite Lane" });
  });

  afterAll(async () => {
    const service = createServiceClient();
    if (job) await service.from("jobs").delete().eq("id", job.id);
    await service.from("invites").delete().eq("phone", JOE);
  });

  it("puts the invitee on the Job when they accept, so it is waiting for them", async () => {
    const invite = await createInvite(alex, {
      companyId: COMPANY_A.id,
      phone: JOE,
      role: "site_team",
      fullName: "Joe Joiner",
      jobId: job.id,
    });
    expect(invite.jobId).toBe(job.id);

    const joe = await signInAs(JOE);
    expect(await listJobs(joe, COMPANY_A.id)).toEqual([]);
    await acceptInvite(joe, { code: invite.code, fullName: "Joe Joiner" });

    expect((await listJobs(joe, COMPANY_A.id)).map((j) => j.name)).toEqual(["Invite Lane"]);
    expect(await listJobPeople(alex, job)).toEqual([
      expect.objectContaining({ fullName: "Joe Joiner", role: "site_team", isJobLead: false }),
    ]);

    // Clean up the Membership so the next run starts from a fresh person.
    const service = createServiceClient();
    const { data } = await joe.auth.getUser();
    await service.from("memberships").delete().eq("user_id", data.user!.id);
  });
});
