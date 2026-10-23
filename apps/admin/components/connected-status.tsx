"use client";

import { getPlatformStatus } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/** One-line platform status for the login screens; the home page shows the full card. */
export function ConnectedStatus() {
  const supabase = useMemo(() => createClient(), []);
  const status = useQuery({
    queryKey: ["platform_status"],
    queryFn: () => getPlatformStatus(supabase),
    retry: false,
  });

  if (status.isPending) return <p className="text-xs text-[#64748B]">Connecting…</p>;
  if (status.isError) {
    return (
      <p role="alert" className="text-xs text-destructive">
        Not connected: {status.error.message}
      </p>
    );
  }
  return (
    <p className="text-xs text-[#64748B]" data-testid="connected">
      <span className="text-[#10B981]">Connected</span> ·{" "}
      <span className="font-mono" data-testid="platform-message">
        {status.data.message}
      </span>
    </p>
  );
}
