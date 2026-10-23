"use client";

import type { Membership } from "@jnj/shared";
import { roleLabel } from "@jnj/shared";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { clearPendingLogin } from "@/lib/pending-login";
import { createClient } from "@/lib/supabase/client";

export function AppHeader({ current, canSwitch }: { current: Membership; canSwitch: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logOut() {
    clearPendingLogin();
    await supabase.auth.signOut();
    // Drop everything cached for this User before the next one logs in.
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex min-h-[60px] items-center gap-2.5 border-b border-border px-4">
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-[17px] font-semibold" data-testid="current-company">
          {current.companyName}
        </span>
        <span className="text-xs text-[#64748B]">{roleLabel[current.role]}</span>
      </div>
      {current.role === "admin" && (
        <Link href="/billing" className="text-[15px] font-semibold text-primary">
          Billing
        </Link>
      )}
      {canSwitch && (
        <Link href="/choose-company" className="text-[15px] font-semibold text-primary">
          Switch
        </Link>
      )}
      <Button type="button" variant="outline" onClick={logOut}>
        Log out
      </Button>
    </header>
  );
}
