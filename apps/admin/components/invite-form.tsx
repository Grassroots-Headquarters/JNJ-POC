"use client";

import { createInvite, roleLabel, sendInvite, type Role } from "@jnj/shared";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/** Role order from the Admin demo's Invite form. */
export const ROLE_OPTIONS: Role[] = ["site_team", "subcontractor", "admin"];

export const selectClass =
  "w-full rounded-[10px] border border-border bg-background p-3 text-[15px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45";

/**
 * The Admin demo's "Invite someone" form: creates the Invite (optionally onto
 * a Job) and texts it. Used on Team, on a Job and in the guided first Job.
 */
export function InviteForm({
  companyId,
  jobId,
  heading = "Invite someone",
  onSent,
  onError,
}: {
  companyId: string;
  /** Put the invitee on this Job when they accept. */
  jobId?: string;
  heading?: string;
  onSent: (mobile: string) => void;
  onError: (message: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<Role>("site_team");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const invite = await createInvite(supabase, { companyId, phone: mobile, role, fullName: name, jobId });
      try {
        await sendInvite(supabase, invite.id);
      } catch (e) {
        onError(
          `The Invite was saved but the text could not be sent (${e instanceof Error ? e.message : "unknown error"}). Resend it below.`,
        );
        return;
      }
      onSent(mobile.trim());
      setName("");
      setMobile("");
      setRole("site_team");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not send the Invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-2.5" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {heading}
      </h2>
      <form onSubmit={onSubmit} className="grid gap-2.5">
        <div className="flex gap-2 *:flex-1">
          <Label>
            Name
            <Input name="name" placeholder="e.g. Tom" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Label>
          <Label>
            Mobile
            <Input
              name="mobile"
              inputMode="tel"
              autoComplete="off"
              placeholder="07…"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </Label>
        </div>
        <Label>
          Role
          <select
            name="role"
            aria-label="Role"
            className={selectClass}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {roleLabel[option]}
              </option>
            ))}
          </select>
        </Label>
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy}>
          Send invite by SMS
        </Button>
      </form>
    </section>
  );
}
