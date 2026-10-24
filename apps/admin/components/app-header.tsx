"use client";

import type { Membership } from "@mba/shared";
import { roleLabel } from "@mba/shared";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { clearPendingLogin } from "@/lib/pending-login";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Jobs", adminOnly: false },
  { href: "/team", label: "Team", adminOnly: true },
  { href: "/billing", label: "Billing", adminOnly: true },
];

export function AppHeader({ current, canSwitch }: { current: Membership; canSwitch: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
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
    <header className="flex min-h-[60px] items-center gap-4 border-b border-border px-4">
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-[17px] font-semibold" data-testid="current-company">
          {current.companyName}
        </span>
        <span className="text-xs text-[#64748B]">{roleLabel[current.role]}</span>
      </div>
      <nav aria-label="Main" className="flex items-center gap-4 text-[13px]">
        {NAV.filter((item) => !item.adminOnly || current.role === "admin").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent(item.href, pathname) ? "page" : undefined}
            className={
              isCurrent(item.href, pathname)
                ? "border-b-2 border-primary pb-0.5 font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
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

/** Jobs stays highlighted on a Job's own pages. */
function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/jobs/") || pathname === "/welcome";
  return pathname === href;
}
