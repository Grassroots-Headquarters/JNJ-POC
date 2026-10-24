"use client";

import { useEffect } from "react";
import { rememberPendingInviteCode } from "@/lib/pending-invite";

/** Keeps the Invite code in this browser so logging into the Admin app accepts it. */
export function RememberInviteCode({ code }: { code: string }) {
  useEffect(() => {
    rememberPendingInviteCode(code);
  }, [code]);
  return null;
}
