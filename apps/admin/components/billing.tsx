"use client";

import {
  addOnLabel,
  getCompanyBilling,
  openBillingPortal,
  setBillingEmail,
  startCheckout,
  summariseAddOn,
} from "@jnj/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/app-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useAddOns } from "@/lib/use-add-ons";
import { useCurrentCompany } from "@/lib/use-current-company";
import { useIsClient } from "@/lib/use-is-client";

/** /billing: the Client Portal Add-on, Stripe's hosted pages, the receipts email and the Referral code. */
export function Billing() {
  const { memberships, membership, canSwitch } = useCurrentCompany();

  if (memberships.isPending) return <main className="p-6 text-muted-foreground">Loading…</main>;
  if (memberships.isError) {
    return (
      <main className="p-6" role="alert">
        <p className="font-medium text-destructive">Could not load your Companies</p>
        <p className="text-sm text-muted-foreground">{memberships.error.message}</p>
      </main>
    );
  }
  if (!membership) return null;

  return (
    <>
      <AppHeader current={membership} canSwitch={canSwitch} />
      <main className="flex flex-1 justify-center p-6">
        <div className="grid w-full max-w-[480px] content-start gap-4">
          <h1 className="text-xl font-semibold">Billing</h1>
          {membership.role === "admin" ? (
            <AdminBilling companyId={membership.companyId} />
          ) : (
            <p className="text-[15px] text-muted-foreground" data-testid="billing-admins-only">
              Only Admins can manage billing. Ask an Admin of {membership.companyName} if something needs changing.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

function checkoutOutcome(): "success" | "cancelled" | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("checkout");
  return value === "success" || value === "cancelled" ? value : null;
}

function AdminBilling({ companyId }: { companyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const isClient = useIsClient();
  const outcome = isClient ? checkoutOutcome() : null;

  const addOns = useAddOns(companyId, { refetchInterval: outcome === "success" ? 5_000 : false });
  const company = useQuery({
    queryKey: ["company_billing", companyId],
    queryFn: () => getCompanyBilling(supabase, companyId),
    retry: false,
  });
  const clientPortal = addOns.data?.find((a) => a.addOn === "client_portal");
  const summary = summariseAddOn(clientPortal);
  const returnUrl = isClient ? `${window.location.origin}/billing` : "";

  const [actionError, setActionError] = useState<string | null>(null);
  const checkout = useMutation({
    mutationFn: () => startCheckout(supabase, { companyId, addOn: "client_portal", returnUrl }),
    onMutate: () => setActionError(null),
    onSuccess: (url) => window.location.assign(url),
    onError: (e) => setActionError(e.message),
  });
  const portal = useMutation({
    mutationFn: () => openBillingPortal(supabase, { companyId, returnUrl }),
    onMutate: () => setActionError(null),
    onSuccess: (url) => window.location.assign(url),
    onError: (e) => setActionError(e.message),
  });
  const busy = checkout.isPending || portal.isPending;

  return (
    <>
      {outcome === "success" && !summary.on && (
        <Alert tone="success">Thanks. Stripe is confirming the payment; this page updates as soon as it does.</Alert>
      )}
      {outcome === "cancelled" && <Alert>Checkout was cancelled. Nothing has been charged.</Alert>}

      <Card data-testid="client-portal-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{addOnLabel.client_portal}</CardTitle>
            <span
              data-testid="client-portal-state"
              className={
                summary.on
                  ? "rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-semibold text-[#10B981]"
                  : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
              }
            >
              {summary.label}
            </span>
          </div>
          <CardDescription>Lets your Clients see their Jobs. Billed monthly per Company.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {addOns.isError ? (
            <p role="alert" className="text-[13px] text-destructive">
              {addOns.error.message}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground" data-testid="client-portal-detail">
              {addOns.isPending ? "Checking with Stripe…" : summary.detail}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!summary.on && (
              <Button type="button" size="lg" disabled={busy || addOns.isPending} onClick={() => checkout.mutate()}>
                Switch on Client Portal
              </Button>
            )}
            <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => portal.mutate()}>
              Manage card and invoices
            </Button>
          </div>
          {actionError && <Alert>{actionError}</Alert>}
          <p className="text-xs text-[#64748B]">
            Payment happens on Stripe&apos;s own pages; card details never pass through this app. The Add-on switches on
            once Stripe confirms payment and off if payment stops and is not recovered.
          </p>
        </CardContent>
      </Card>

      <BillingEmailCard
        companyId={companyId}
        billingEmail={company.data?.billingEmail ?? ""}
        loaded={company.isSuccess}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["company_billing", companyId] })}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your Referral code</CardTitle>
          <CardDescription>
            Share it with another company. When they pay for their first month of an Add-on, you both get a month
            free.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold tracking-[0.2em]" data-testid="referral-code">
            {company.data?.referralCode ?? "…"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function BillingEmailCard({
  companyId,
  billingEmail,
  loaded,
  onSaved,
}: {
  companyId: string;
  billingEmail: string;
  loaded: boolean;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  // Null until the Admin types: the field then shows what is saved.
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? billingEmail;
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => setBillingEmail(supabase, companyId, email),
    onSuccess: () => {
      setSaved(true);
      setTyped(null);
      onSaved();
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    save.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing email</CardTitle>
        <CardDescription>Where Stripe sends receipts and invoices. Email is never used to log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Label>
            Billing email
            <Input
              type="email"
              name="billingEmail"
              placeholder="accounts@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setSaved(false);
                setTyped(e.target.value);
              }}
              disabled={!loaded}
            />
          </Label>
          {save.isError && <Alert>{save.error.message}</Alert>}
          {saved && <Alert tone="success">Saved.</Alert>}
          <div>
            <Button type="submit" variant="outline" disabled={!loaded || save.isPending || email === billingEmail}>
              Save billing email
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
