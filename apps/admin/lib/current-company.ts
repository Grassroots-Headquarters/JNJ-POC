const KEY = "mba.currentCompanyId";

/** The Company the Admin last chose on this browser; RLS still decides access. */
export function getRememberedCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function rememberCompanyId(companyId: string): void {
  window.localStorage.setItem(KEY, companyId);
}

export function forgetCompanyId(): void {
  window.localStorage.removeItem(KEY);
}
