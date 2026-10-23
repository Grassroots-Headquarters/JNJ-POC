"use client";

import { useEffect } from "react";
import { setPendingInviteCode } from "@/lib/pending-invite";

/** Keeps the Invite code in this browser so logging into the Admin app accepts it. */
export function RememberInviteCode({ code }: { code: string }) {
  useEffect(() => {
    setPendingInviteCode(code);
  }, [code]);
  return null;
}
