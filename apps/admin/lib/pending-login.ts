const KEY = "jnj.pendingLogin";

/** What the code entry page needs to finish a login or a Company sign-up. */
export type PendingLogin = {
  /** E.164, what Supabase was asked to text. */
  phone: string;
  /** The number as the person typed it, shown back to them. */
  phoneAsTyped: string;
  signUp?: {
    companyName: string;
    fullName: string;
    referralCode: string;
  };
};

export function getPendingLogin(): PendingLogin | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingLogin;
  } catch {
    return null;
  }
}

export function setPendingLogin(pending: PendingLogin): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(pending));
}

export function clearPendingLogin(): void {
  window.sessionStorage.removeItem(KEY);
}
