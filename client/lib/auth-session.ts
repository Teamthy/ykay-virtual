// Shared helpers for Next.js auth routes that mint `ykv_session` on the APP
// host (Google callback + College SSO handoff). Cookie Secure follows the
// request protocol so localhost HTTP is not silently dropped.

export function applySessionCookie(
  response: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } },
  token: string,
  requestUrl: string,
) {
  const secure = new URL(requestUrl).protocol === "https:";
  response.cookies.set("ykv_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function destForUser(user?: {
  onboarded?: boolean;
  roles?: string[];
} | null): string {
  if (!user?.onboarded) return "/onboarding/wizard";
  const roles = user.roles ?? [];
  if (roles.includes("SUPER_ADMIN") || roles.includes("ACADEMIC_ADMIN"))
    return "/admin";
  if (roles.includes("TUTOR")) return "/tutor-dashboard";
  if (roles.includes("STUDENT")) return "/student-dashboard";
  return "/dashboard";
}

export function completePath(
  origin: string,
  dest: string,
): string {
  const next = dest.startsWith("/") && !dest.startsWith("//") ? dest : "/dashboard";
  return new URL(`/auth/complete?next=${encodeURIComponent(next)}`, origin).toString();
}

/** Same upstream the /api/v1 proxy uses — Google exchange must hit THIS API. */
export function apiV1Base(): string {
  const proxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (proxy) return `${proxy}/api/v1`;
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(
    /\/$/,
    "",
  );
}
