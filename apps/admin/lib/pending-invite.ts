const KEY = "jnj.pendingInviteCode";

/**
 * The Invite code a visitor arrived with on /invite/<code>, kept until they
 * have logged in so the Invite is picked up without finding the link again.
 */
export function getPendingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setPendingInviteCode(code: string): void {
  window.localStorage.setItem(KEY, code);
}

export function clearPendingInviteCode(): void {
  window.localStorage.removeItem(KEY);
}
