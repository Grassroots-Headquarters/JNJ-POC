"use client";

import { normalisePhone, requestLoginCode } from "@mba/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPendingLogin } from "@/lib/pending-login";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const phone = normalisePhone(mobile);
    if (!phone) {
      setError("Enter a mobile number like 07700 900123.");
      return;
    }
    setSending(true);
    try {
      await requestLoginCode(supabase, phone);
      setPendingLogin({ phone, phoneAsTyped: mobile.trim() });
      router.push("/verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.");
      setSending(false);
    }
  }

  return (
    <AuthScreen title="Site App" caption="Admin app">
      <form onSubmit={onSubmit} className="grid gap-3">
        <h2 className="text-[17px] font-semibold">Log in</h2>
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
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-[15px] font-semibold" disabled={sending}>
          Send login code
        </Button>
      </form>
      <p className="text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link href="/sign-up" className="text-primary">
          Sign your Company up
        </Link>
      </p>
    </AuthScreen>
  );
}
