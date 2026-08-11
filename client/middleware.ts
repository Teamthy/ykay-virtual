import { NextRequest, NextResponse } from "next/server";

// Route guards (AGENTS.md: middleware.ts guards authenticated portals).
// Protected surfaces redirect to /login when the session cookie is absent;
// auth pages redirect to /dashboard when already signed in.

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tutor-dashboard",
  "/messages",
  "/notifications",
  "/admin",
  "/checkout",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("ykay_session");

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tutor-dashboard/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
