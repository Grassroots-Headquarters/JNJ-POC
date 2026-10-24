import { describe, expect, it } from "vitest";
import { canBeJobLead, formatStartDate, jobAddress, jobPersonLabel, peopleToAssign, sortJobPeople, type JobPerson } from "./jobs";
import type { Member } from "./members";

const person = (overrides: Partial<JobPerson>): JobPerson => ({
  userId: "u",
  fullName: "Someone",
  role: "site_team",
  trade: null,
  isJobLead: false,
  ...overrides,
});

describe("jobAddress", () => {
  it("shows the address when there is one and 'Address to follow' when not", () => {
    expect(jobAddress({ address: "12 Overbury Ave, Beckenham" })).toBe("12 Overbury Ave, Beckenham");
    expect(jobAddress({ address: null })).toBe("Address to follow");
  });
});

describe("formatStartDate", () => {
  it("writes the date the British way, whatever the time zone", () => {
    expect(formatStartDate("2026-11-02")).toBe("2 Nov 2026");
    expect(formatStartDate("2026-01-31")).toBe("31 Jan 2026");
  });

  it("is null when there is no start date", () => {
    expect(formatStartDate(null)).toBeNull();
  });
});

describe("jobPersonLabel", () => {
  it("names the Role, the Job lead and a Subcontractor's trade", () => {
    expect(jobPersonLabel(person({ isJobLead: true }))).toBe("Site team · Job lead");
    expect(jobPersonLabel(person({}))).toBe("Site team");
    expect(jobPersonLabel(person({ role: "subcontractor", trade: "Electrician" }))).toBe("Subcontractor · Electrician");
    expect(jobPersonLabel(person({ role: "admin" }))).toBe("Admin");
  });

  it("calls someone with no Membership the Client", () => {
    expect(jobPersonLabel(person({ role: null }))).toBe("Client");
  });
});

describe("canBeJobLead", () => {
  it("is only true for Site team", () => {
    expect(canBeJobLead("site_team")).toBe(true);
    expect(canBeJobLead("subcontractor")).toBe(false);
    expect(canBeJobLead("admin")).toBe(false);
    expect(canBeJobLead(null)).toBe(false);
  });
});

describe("sortJobPeople", () => {
  it("puts the Job lead first, then Members by name, then the Client", () => {
    const sorted = sortJobPeople([
      person({ fullName: "Cleo", role: null }),
      person({ fullName: "Zak" }),
      person({ fullName: "Mark", isJobLead: true }),
      person({ fullName: "Abe", role: "subcontractor" }),
    ]);
    expect(sorted.map((p) => p.fullName)).toEqual(["Mark", "Abe", "Zak", "Cleo"]);
  });
});

describe("peopleToAssign", () => {
  it("offers the Company's Members who are not on the Job yet", () => {
    const members: Member[] = [
      { userId: "a", fullName: "Ali", role: "admin", trade: null },
      { userId: "m", fullName: "Mark", role: "site_team", trade: null },
      { userId: "s", fullName: "Sparks Ltd", role: "subcontractor", trade: "Electrician" },
    ];
    expect(peopleToAssign(members, [person({ userId: "m" })]).map((m) => m.userId)).toEqual(["a", "s"]);
  });
});
