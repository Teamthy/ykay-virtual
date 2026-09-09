import { NextRequest, NextResponse } from "next/server";

/** Same-origin API proxy so ykv_session stays on the APP host.
 *
 * next.config.js used to rewrite /api/v1 → Render in `afterFiles`, which
 * runs BEFORE this catch-all and dropped or mishandled cookies. The rewrite
 * is now `fallback` only; this route is the real proxy.
 */

function upstreamBase(): string {
  const proxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (proxy) return proxy;
  const pub = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  return pub.replace(/\/api\/v1\/?$/, "");
}

function cookieValue(header: string, name: string): string {
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) {
      const raw = trimmed.slice(eq + 1);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return "";
}

/** Drop Domain so Set-Cookie from Render binds to this Vercel host. */
function hostOnlySetCookie(raw: string): string {
  return raw
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^domain=/i.test(p))
    .join("; ");
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const dest = `${upstreamBase()}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  let auth = req.headers.get("authorization");
  if (!auth && cookie) {
    const token = cookieValue(cookie, "ykv_session");
    if (token) auth = `Bearer ${token}`;
  }
  if (auth) headers.set("authorization", auth);

  const trace =
    req.headers.get("x-trace-id") || req.headers.get("x-request-id");
  if (trace) {
    headers.set("x-trace-id", trace);
    headers.set("x-request-id", trace);
  }

  const host = req.headers.get("host") || req.nextUrl.host;
  headers.set("x-forwarded-host", host);
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));
  headers.set("x-forwarded-origin", req.nextUrl.origin);
  const origin = req.headers.get("origin");
  if (origin) headers.set("origin", origin);
  const referer = req.headers.get("referer");
  if (referer) headers.set("referer", referer);

  const init: RequestInit = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    init.body = await req.arrayBuffer();
  }

  const up = await fetch(dest, init);
  const out = new NextResponse(up.body, { status: up.status });
  up.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "set-cookie") return;
    if (k === "content-encoding" || k === "transfer-encoding") return;
    out.headers.set(key, value);
  });
  const setCookie = up.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    out.headers.append("set-cookie", hostOnlySetCookie(c));
  }
  return out;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function HEAD(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
