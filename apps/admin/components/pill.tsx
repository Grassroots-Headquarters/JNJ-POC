import type { Invite } from "@jnj/shared";
import type { ReactNode } from "react";

/** Demo `.pill`: amber for a pending Invite, green for accepted or a Job lead, muted otherwise. */
export function Pill({ children, tone }: { children: ReactNode; tone?: Invite["status"] | "lead" }) {
  const colour =
    tone === "pending"
      ? "border-[#F59E0B]/50 bg-[#F59E0B]/12 text-[#F59E0B]"
      : tone === "accepted" || tone === "lead"
        ? "border-[#10B981]/50 bg-[#10B981]/12 text-[#10B981]"
        : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${colour}`}>
      {children}
    </span>
  );
}
