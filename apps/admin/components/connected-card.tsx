"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformStatus } from "@jnj/shared";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

/** Reads the platform_status row to show the Admin app is talking to Supabase. */
export function ConnectedCard() {
  const supabase = useMemo(() => createClient(), []);
  const status = useQuery({
    queryKey: ["platform_status"],
    queryFn: () => getPlatformStatus(supabase),
    retry: false,
  });

  return (
    <Card className="w-full max-w-sm" data-testid="connected-card">
      <CardHeader>
        <CardTitle>JNJ Site App</CardTitle>
        <CardDescription>Admin app</CardDescription>
      </CardHeader>
      <CardContent>
        {status.isPending && <p className="text-muted-foreground">Connecting…</p>}
        {status.isError && (
          <div role="alert" className="grid gap-1">
            <p className="font-medium text-destructive">Not connected</p>
            <p className="text-sm text-muted-foreground">{status.error.message}</p>
          </div>
        )}
        {status.isSuccess && (
          <div className="grid gap-1" data-testid="connected">
            <p className="font-medium text-[#10B981]">Connected</p>
            <p className="font-mono text-sm text-muted-foreground" data-testid="platform-message">
              {status.data.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
