"use client";

import { roleLabel } from "@jnj/shared";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { rememberCompanyId } from "@/lib/current-company";
import { useMemberships } from "@/lib/use-memberships";

export default function ChooseCompanyPage() {
  const memberships = useMemberships();
  const router = useRouter();

  function choose(companyId: string) {
    rememberCompanyId(companyId);
    router.push("/");
  }

  return (
    <AuthScreen title="Choose company" caption="Pick one to run it. You can switch any time.">
      {memberships.isPending && <p className="text-[13px] text-muted-foreground">Loading…</p>}
      {memberships.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {memberships.error.message}
        </p>
      )}
      {memberships.isSuccess && (
        <ul className="grid gap-2.5" data-testid="company-chooser">
          {memberships.data.map((m) => (
            <li key={m.companyId}>
              <button
                type="button"
                onClick={() => choose(m.companyId)}
                className="grid w-full gap-1 rounded-[14px] border border-border bg-secondary p-3.5 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <b className="font-semibold">{m.companyName}</b>
                <span className="text-[13px] text-muted-foreground">{roleLabel[m.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AuthScreen>
  );
}
