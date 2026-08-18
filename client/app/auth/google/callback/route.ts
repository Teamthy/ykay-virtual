import { NextResponse } from "next/server";

// Google OAuth callback — runs on the APP host so the session cookie is set
// for the web app (fixes the cookie-domain bug of the old API-only flow).
// 1. Browser is redirected here by Google with ?code=&state=
// 2. We exchange code+state with the API server-side (never expose the
//    token to the browser), getting the raw session token back.
// 3. We set the nuvora_session httpOnly cookie on this host and send the user
//    to their dashboard (or onboarding for fresh accounts).

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/auth/google/error?reason=${encodeURIComponent(reason)}`, url.origin)
    );

  if (error || !code || !state) {
    return fail(error || "Missing authorization code");
  }

  try {
    const res = await fetch(`${API_BASE}/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return fail(body?.error?.message || "Google sign-in could not be completed");
    }
    const { token, user } = (await res.json()).data as {
      token: string;
      user: { roles: string[]; status: string; onboarded?: boolean };
    };

    const dest = user.onboarded ? "/dashboard" : "/onboarding/wizard";
    const response = NextResponse.redirect(new URL(dest, url.origin));
    response.cookies.set("nuvora_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    return response;
  } catch {
    return fail("Network error while completing sign-in");
  }
}
