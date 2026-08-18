import { NextRequest, NextResponse } from "next/server";

// Route guards (AGENTS.md: middleware.ts guards authenticated portals).
// Protected surfaces redirect to /login when the session cookie is absent;
// auth pages redirect to /dashboard when already signed in.

// Authenticated surfaces. Any page here requires a session; unauthenticated
// visitors are sent to /login with a `next` return target.
//
// NOTE: /onboarding (the exact path) is the PUBLIC create-account entry - its
// step 1 registers the account, so it must be reachable WITHOUT a session.
// Previously "/onboarding" was in this list, which made the flow
// /register → /onboarding → (no session) → /login: clicking "Create an
// account" bounced straight back to the login page, users could never create
// an account, and - because no account could ever be onboarded - login kept
// sending every user to the wizard instead of their dashboard. The post-login
// steps (/onboarding/wizard and /onboarding/learner) stay protected.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/student-dashboard",
  "/tutor-dashboard",
  "/lms",
  "/account",
  "/messages",
  "/notifications",
  "/onboarding/wizard",
  "/onboarding/learner",
  "/admin",
  "/checkout",
  // A-25: saved (wishlist) and chat are authenticated surfaces. They were
  // previously only guarded by a client-side redirect AFTER hydration, so an
  // unauthenticated visitor got a 200 + page flash before being bounced to
  // /login. Guarding at the middleware makes the redirect instant and keeps
  // SSR from rendering an empty authenticated shell.
  "/saved",
  "/chat",
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
    "/onboarding/wizard/:path*",
    "/onboarding/learner/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/saved/:path*",
    "/chat/:path*",
  ],
};
