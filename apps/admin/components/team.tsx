"use client";

import {
  cancelInvite,
  changeMemberRole,
  createInvite,
  inviteStatusLabel,
  listInvites,
  listMembers,
  removeMember,
  resendInvite,
  roleLabel,
  sendInvite,
  type Invite,
  type Member,
  type Role,
} from "@jnj/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useCurrentCompany } from "@/lib/use-current-company";
import { membershipsQueryKey } from "@/lib/use-memberships";

/** Role order from the Admin demo's Invite form. */
const ROLE_OPTIONS: Role[] = ["site_team", "subcontractor", "admin"];

const selectClass =
  "w-full rounded-[10px] border border-border bg-background p-3 text-[15px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45";

/** Team: who is in the Company, with their Role, and the Invites sent to join it. */
export function Team() {
  const { memberships, membership, canSwitch } = useCurrentCompany();

  if (memberships.isError) {
    return (
      <main className="p-6" role="alert">
        <p className="font-medium text-destructive">Could not load your Companies</p>
        <p className="text-sm text-muted-foreground">{memberships.error.message}</p>
      </main>
    );
  }
  // Loading, or on the way to the chooser or home.
  if (!membership) return <main className="p-6 text-muted-foreground">Loading…</main>;

  return (
    <>
      <AppHeader current={membership} canSwitch={canSwitch} />
      <main className="mx-auto grid w-full max-w-[640px] gap-6 p-6">
        <h1 className="text-[17px] font-semibold">Team</h1>
        {membership.role === "admin" ? (
          <TeamAdmin companyId={membership.companyId} />
        ) : (
          <p className="text-[13px] text-muted-foreground">Only Admins can manage people and Invites.</p>
        )}
      </main>
    </>
  );
}

function TeamAdmin({ companyId }: { companyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => listMembers(supabase, companyId),
    retry: false,
  });
  const invites = useQuery({
    queryKey: ["invites", companyId],
    queryFn: () => listInvites(supabase, companyId),
    retry: false,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["invites", companyId] });
    // The Admin may have changed their own Role.
    void queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
  }

  function fail(e: unknown, fallback: string) {
    setToast(null);
    setError(e instanceof Error ? e.message : fallback);
  }

  const changeRole = useMutation({
    mutationFn: (input: { userId: string; role: Role }) => changeMemberRole(supabase, { companyId, ...input }),
    onSuccess: (_, input) => {
      setError(null);
      setToast(`Role changed to ${roleLabel[input.role]}.`);
      refresh();
    },
    onError: (e) => fail(e, "Could not change the Role."),
  });
  const remove = useMutation({
    mutationFn: (member: Member) => removeMember(supabase, { companyId, userId: member.userId }),
    onSuccess: (_, member) => {
      setError(null);
      setToast(`${member.fullName || "That person"} no longer has access to this Company.`);
      refresh();
    },
    onError: (e) => fail(e, "Could not remove that person."),
  });
  const cancel = useMutation({
    mutationFn: (invite: Invite) => cancelInvite(supabase, invite.id),
    onSuccess: (_, invite) => {
      setError(null);
      setToast(`Invite to ${invite.phone} cancelled.`);
      refresh();
    },
    onError: (e) => fail(e, "Could not cancel the Invite."),
  });
  const resend = useMutation({
    mutationFn: async (invite: Invite) => {
      const fresh = await resendInvite(supabase, invite.id);
      await sendInvite(supabase, fresh.id);
    },
    onSuccess: (_, invite) => {
      setError(null);
      setToast(`Invite sent to ${invite.phone}.`);
      refresh();
    },
    onError: (e) => fail(e, "Could not resend the Invite."),
  });

  return (
    <>
      {toast && <Alert tone="success">{toast}</Alert>}
      {error && <Alert>{error}</Alert>}

      <section className="grid gap-2.5" aria-labelledby="people-heading">
        <h2 id="people-heading" className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          People
        </h2>
        {members.isPending && <p className="text-[13px] text-muted-foreground">Loading…</p>}
        {members.isError && (
          <p role="alert" className="text-[13px] text-destructive">
            {members.error.message}
          </p>
        )}
        <ul className="grid gap-2.5" data-testid="members">
          {members.data?.map((member) => (
            <li
              key={member.userId}
              className="grid gap-2 rounded-[14px] border border-border bg-secondary p-3.5"
              data-testid="member"
            >
              <div className="flex items-center justify-between gap-2">
                <b className="font-semibold">{member.fullName || "Name to follow"}</b>
                <Pill>{member.trade ? `${roleLabel[member.role]} · ${member.trade}` : roleLabel[member.role]}</Pill>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  Role
                  <select
                    className={`${selectClass} w-auto py-1.5`}
                    aria-label={`Role for ${member.fullName || "this person"}`}
                    value={member.role}
                    disabled={changeRole.isPending}
                    onChange={(e) => changeRole.mutate({ userId: member.userId, role: e.target.value as Role })}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${member.fullName || "this person"} from the Company?`)) {
                      remove.mutate(member);
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <InviteForm
        companyId={companyId}
        onSent={(mobile) => {
          setError(null);
          setToast(`Invite sent to ${mobile}.`);
          refresh();
        }}
        onError={(message) => fail(new Error(message), message)}
      />

      <section className="grid gap-2.5" aria-labelledby="invites-heading">
        <h2 id="invites-heading" className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Invites
        </h2>
        {invites.isPending && <p className="text-[13px] text-muted-foreground">Loading…</p>}
        {invites.isError && (
          <p role="alert" className="text-[13px] text-destructive">
            {invites.error.message}
          </p>
        )}
        {invites.isSuccess && invites.data.length === 0 && (
          <p className="text-xs text-[#64748B]">No Invites sent yet.</p>
        )}
        <ul className="grid gap-2.5" data-testid="invites">
          {invites.data?.map((invite) => (
            <li
              key={invite.id}
              className="grid gap-1 rounded-[14px] border border-border bg-secondary p-3.5"
              data-testid="invite"
              data-status={invite.status}
            >
              <div className="flex items-center justify-between gap-2">
                <b className="font-semibold">{invite.fullName || invite.phone}</b>
                <Pill tone={invite.status}>{inviteStatusLabel[invite.status]}</Pill>
              </div>
              <span className="text-[13px] text-muted-foreground">
                {roleLabel[invite.role]} · {invite.phone}
              </span>
              {(invite.status === "pending" || invite.status === "expired") && (
                <div className="mt-1.5 flex gap-2">
                  <Button type="button" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(invite)}>
                    Resend
                  </Button>
                  {invite.status === "pending" && (
                    <Button type="button" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(invite)}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function InviteForm({
  companyId,
  onSent,
  onError,
}: {
  companyId: string;
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
      const invite = await createInvite(supabase, { companyId, phone: mobile, role, fullName: name });
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
        Invite someone
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

function Pill({ children, tone }: { children: ReactNode; tone?: Invite["status"] }) {
  const colour =
    tone === "pending"
      ? "border-[#F59E0B]/50 bg-[#F59E0B]/12 text-[#F59E0B]"
      : tone === "accepted"
        ? "border-[#10B981]/50 bg-[#10B981]/12 text-[#10B981]"
        : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${colour}`}>
      {children}
    </span>
  );
}
