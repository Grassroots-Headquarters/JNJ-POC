"use client";

import { listAddOns } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export const addOnsQueryKey = (companyId: string) => ["add-ons", companyId] as const;

/**
 * The Company's Add-ons as Stripe last reported them, read through RLS as
 * the logged-in Member. `refetchInterval` is for the moments after Stripe
 * Checkout, while the webhook is still on its way.
 */
export function useAddOns(companyId: string, options: { refetchInterval?: number | false } = {}) {
  const supabase = useMemo(() => createClient(), []);
  return useQuery({
    queryKey: addOnsQueryKey(companyId),
    queryFn: () => listAddOns(supabase, companyId),
    retry: false,
    refetchInterval: options.refetchInterval ?? false,
  });
}
