// Deep-link safety for auth flows.
//
// Every auth page that accepts a "next" target must validate it with
// safeNextPath so a crafted ?next=https://evil.example can never turn the
// login form into an open redirect. Rules:
//   * must be a root-relative path ("/cohorts/utme-2026?tab=live")
//   * no protocol-relative "//" or backslash/encoded-backslash tricks
//   * no auth-loop targets (login -> login -> login ...)

const AUTH_PREFIXES = [
  "/login",
  "/login-code",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith("/")) return null;
  if (
    v.startsWith("//") ||
    v.includes("\\") ||
    v.includes("://") ||
    v.includes("%5c")
  )
    return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(v)) return null;
  let path: string;
  let search: string;
  try {
    const u = new URL(v, "https://ykvirtual.invalid");
    path = u.pathname;
    search = u.search;
  } catch {
    return null;
  }
  const lower = `${path}${search}`.toLowerCase();
  if (
    AUTH_PREFIXES.some(
      (p) =>
        lower === p || lower.startsWith(`${p}/`) || lower.startsWith(`${p}?`),
    )
  ) {
    return null;
  }
  return `${path}${search}`;
}

/** Appends a validated next target to an auth route, or returns the route bare. */
export function withNext(
  route: string,
  next: string | null | undefined,
): string {
  const n = safeNextPath(next);
  return n ? `${route}?next=${encodeURIComponent(n)}` : route;
}

/** "/login?next=<current page>" - for client-side "log in first" redirects. */
export function loginWithReturn(): string {
  if (typeof window === "undefined") return "/login";
  return withNext("/login", window.location.pathname + window.location.search);
}
