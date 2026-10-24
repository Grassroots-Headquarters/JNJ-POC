"use client";

import { normalisePhone, requestLoginCode, signUpCompany } from "@mba/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rememberCompanyId } from "@/lib/current-company";
import { setPendingLogin } from "@/lib/pending-login";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const phone = normalisePhone(mobile);
    if (!phone) {
      setError("Enter a mobile number like 07700 900123.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Already logged in (an Admin adding a second Company): no code needed.
        const companyId = await signUpCompany(supabase, { companyName, fullName, referralCode });
        rememberCompanyId(companyId);
        router.push("/");
        router.refresh();
        return;
      }
      await requestLoginCode(supabase, phone, fullName.trim());
      setPendingLogin({
        phone,
        phoneAsTyped: mobile.trim(),
        signUp: { companyName: companyName.trim(), fullName: fullName.trim(), referralCode: referralCode.trim() },
      });
      router.push("/verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.");
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="My Builder App" caption="Sign your Company up">
      <form onSubmit={onSubmit} className="grid gap-3">
        <h2 className="text-[17px] font-semibold">Create your Company</h2>
        <Label>
          Company name
          <Input
            name="companyName"
            placeholder="e.g. JNJ Building"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </Label>
        <Label>
          Your name
          <Input
            name="fullName"
            autoComplete="name"
            placeholder="e.g. Ali Khan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Label>
        <Label>
          Mobile number
          <Input
            name="mobile"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07700 900123"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
        </Label>
        <Label>
          Referral code (optional)
          <Input
            name="referralCode"
            className="font-mono uppercase"
            placeholder="e.g. A7Q4KX"
            autoCapitalize="characters"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
          <span className="text-xs text-[#64748B]">
            Got one from another company? When you pay for your first month, you both get a month free.
          </span>
        </Label>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={busy}>
          Send login code
        </Button>
      </form>
      <p className="text-center text-[13px] text-muted-foreground">
        Already have a login?{" "}
        <Link href="/login" className="text-primary">
          Log in
        </Link>
      </p>
    </AuthScreen>
  );
}
