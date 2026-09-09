import { NextResponse } from "next/server";
import {
  apiV1Base,
  applySessionCookie,
  completePath,
  destForUser,
} from "@/lib/auth-session";

// Google OAuth callback - runs on the APP host so the session cookie is set
// for the web app (fixes the cookie-domain bug of the old API-only flow).
// 1. Browser is redirected here by Google with ?code=&state=
// 2. We exchange code+state with the API server-side (never expose the
//    token to the browser), getting the raw session token back.
// 3. We set the ykv_session httpOnly cookie on this host and send the user
//    through /auth/complete so a missing cookie never silently dumps them
//    on /login or onboarding step 3 (that was the Google bounce).

const API_BASE = apiV1Base();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(
        `/auth/google/error?reason=${encodeURIComponent(reason)}`,
        url.origin,
      ),
    );

  if (error || !code || !state) {
    return fail(error || "Missing authorization code");
  }

  try {
    const res = await fetch(`${API_BASE}/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        state,
        redirect_uri: `${url.origin}/auth/google/callback`,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return fail(
        body?.error?.message || "Google sign-in could not be completed",
      );
    }
    const body = (await res.json()) as {
      data?: { token?: string; user?: { onboarded?: boolean; roles?: string[] } };
    };
    const token = body.data?.token;
    const user = body.data?.user;
    if (!token) {
      return fail("Google sign-in returned no session token");
    }

    const response = NextResponse.redirect(
      completePath(url.origin, destForUser(user)),
    );
    applySessionCookie(response, token, request.url);
    return response;
  } catch {
    return fail("Network error while completing sign-in");
  }
}
