const PUBLIC_PATHS = ["/login", "/sign-up", "/verify", "/invite"];

/** Pages a visitor can open without being logged in. Everything else needs a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
