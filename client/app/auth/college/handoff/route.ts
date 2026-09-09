import { NextResponse } from "next/server";
import {
  apiV1Base,
  applySessionCookie,
  completePath,
  destForUser,
} from "@/lib/auth-session";

// YK-013: College portal POSTs the ykay_session JWT here (form body, not
// query string). We exchange it with the Virtual API, set ykv_session on
// THIS host, and land on /auth/complete — never a raw 404, never /login
// with a dropped cookie.

const API_BASE = apiV1Base();

function fail(origin: string, reason: string) {
  return NextResponse.redirect(
    new URL(
      `/login?reason=${encodeURIComponent(reason)}`,
      origin,
    ),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/login", url.origin));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { token?: string };
      token = String(body.token || "").trim();
    } else {
      const form = await request.formData();
      token = String(form.get("token") || "").trim();
    }
  } catch {
    return fail(url.origin, "College sign-in did not send a session");
  }

  if (!token) {
    return fail(url.origin, "College sign-in did not send a session");
  }

  try {
    const res = await fetch(`${API_BASE}/auth/college/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return fail(
        url.origin,
        body?.error?.message || "College sign-in could not be completed",
      );
    }
    const body = (await res.json()) as {
      data?: { token?: string; user?: { onboarded?: boolean; roles?: string[] } };
    };
    const session = body.data?.token;
    if (!session) {
      return fail(url.origin, "College sign-in returned no session token");
    }
    const response = NextResponse.redirect(
      completePath(url.origin, destForUser(body.data?.user)),
    );
    applySessionCookie(response, session, request.url);
    return response;
  } catch {
    return fail(url.origin, "Network error while completing College sign-in");
  }
}
