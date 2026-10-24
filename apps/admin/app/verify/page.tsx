"use client";

import { requestLoginCode, signUpCompany, verifyLoginCode } from "@mba/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rememberCompanyId } from "@/lib/current-company";
import { clearPendingLogin, getPendingLogin } from "@/lib/pending-login";
import { createClient } from "@/lib/supabase/client";
import { useIsClient } from "@/lib/use-is-client";

export default function VerifyPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isClient = useIsClient();
  // Read once the browser's sessionStorage is available; undefined while hydrating.
  const pending = useMemo(() => (isClient ? getPendingLogin() : undefined), [isClient]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (pending === undefined) return null;
  if (pending === null) {
    return (
      <AuthScreen title="My Builder App" caption="Admin app">
        <p className="text-center text-[13px] text-muted-foreground">
          Start again from{" "}
          <Link href="/login" className="text-primary">
            Log in
          </Link>
          .
        </p>
      </AuthScreen>
    );
  }

  const backHref = pending.signUp ? "/sign-up" : "/login";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!pending) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await verifyLoginCode(supabase, pending.phone, code.trim());
      if (pending.signUp) {
        const companyId = await signUpCompany(supabase, pending.signUp);
        rememberCompanyId(companyId);
      }
      clearPendingLogin();
      // A new Company goes straight into the guided first Job.
      router.push(pending.signUp ? "/welcome" : "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log in.");
      setBusy(false);
    }
  }

  async function sendNewCode() {
    if (!pending) return;
    setError(null);
    setBusy(true);
    try {
      await requestLoginCode(supabase, pending.phone, pending.signUp?.fullName);
      setCode("");
      setNotice(`We texted a new code to ${pending.phoneAsTyped}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a new code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="My Builder App" caption={pending.signUp ? "Sign your Company up" : "Admin app"}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="flex items-center gap-2.5">
          <Link href={backHref} className="text-[15px] font-medium text-primary">
            ‹ Back
          </Link>
          <h2 className="text-[17px] font-semibold">Enter code</h2>
        </div>
        <p className="text-center text-[13px] text-muted-foreground">
          We texted a 6-digit code to {pending.phoneAsTyped}
        </p>
        <Input
          name="code"
          aria-label="Login code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          className="text-center font-mono text-[28px] font-semibold tracking-[0.3em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
        />
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy}>
          {pending.signUp ? "Create company" : "Log in"}
        </Button>
        <Button type="button" variant="outline" onClick={sendNewCode} disabled={busy}>
          Send a new code
        </Button>
      </form>
    </AuthScreen>
  );
}
