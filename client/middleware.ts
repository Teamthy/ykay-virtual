import { NextRequest, NextResponse } from "next/server";

// Route guards (AGENTS.md: middleware.ts guards authenticated portals).
// Protected surfaces redirect to /login when the session cookie is absent;
// auth pages redirect to /dashboard when already signed in.

// Authenticated surfaces. Any page here requires a session; unauthenticated
// visitors are sent to /login with a `next` return target.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/student-dashboard",
  "/tutor-dashboard",
  "/lms",
  "/account",
  "/messages",
  "/notifications",
  "/onboarding",
  "/admin",
  "/checkout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("nuvora_session");

  // Protect authenticated surfaces: no session → /login with a return target.
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Auth pages are NOT middleware-redirected: the /login page itself routes
  // signed-in users to their role dashboard via destinationFor() (role-aware),
  // so a student is never sent to the parent /dashboard. Middleware must not
  // hardcode /dashboard here.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/student-dashboard/:path*",
    "/tutor-dashboard/:path*",
    "/lms/:path*",
    "/account/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/checkout/:path*",
  ],
};
