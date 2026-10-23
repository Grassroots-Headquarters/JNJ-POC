import type { ReactNode } from "react";
import { ConnectedStatus } from "@/components/connected-status";

/**
 * The narrow centred column the login screens share: brand block on top,
 * the form, then the platform status line.
 */
export function AuthScreen({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="grid w-full max-w-[390px] gap-4 rounded-[28px] border border-border bg-card p-6">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-xs text-[#64748B]">{caption}</p>
        </div>
        {children}
        <div className="text-center">
          <ConnectedStatus />
        </div>
      </div>
    </main>
  );
}
