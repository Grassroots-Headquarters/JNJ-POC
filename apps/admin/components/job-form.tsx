"use client";

import { assignToJob, createJob, type Job, type Member } from "@mba/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { selectClass } from "@/components/invite-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { jobsQueryKey } from "@/lib/use-jobs";

/**
 * The Admin demo's "New job" form: Job name, Address, Start date and,
 * when the Company has Site team, a Job lead. Calls `onCreated` with the Job
 * and the Job lead's name, if one was chosen.
 */
export function JobForm({
  companyId,
  siteTeam = [],
  onCreated,
}: {
  companyId: string;
  /** Site team Members offered as Job lead; the field is hidden when empty. */
  siteTeam?: Member[];
  onCreated: (job: Job, leadName: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the Job a name.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const job = await createJob(supabase, { companyId, name, address, startDate });
      const lead = siteTeam.find((m) => m.userId === leadId) ?? null;
      if (lead) await assignToJob(supabase, { jobId: job.id, userId: lead.userId, jobLead: true });
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey(companyId) });
      onCreated(job, lead ? lead.fullName : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the Job.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Label>
        Job name
        <Input
          name="name"
          placeholder="e.g. Birch Close kitchen"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Label>
      <Label>
        Address
        <Input
          name="address"
          placeholder="Street, town"
          autoComplete="off"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Label>
      <Label>
        Start date
        <Input name="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Label>
      {siteTeam.length > 0 && (
        <Label>
          Job lead
          <select name="lead" className={selectClass} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Choose later</option>
            {siteTeam.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName || "Name to follow"}
              </option>
            ))}
          </select>
        </Label>
      )}
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy}>
        Create job
      </Button>
    </form>
  );
}
