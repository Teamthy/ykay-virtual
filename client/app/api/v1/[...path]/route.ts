import { NextRequest, NextResponse } from "next/server";

/** Same-origin API proxy so ykv_session stays on the Vercel host. */

function upstreamBase(): string {
  const proxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (proxy) return proxy;
  const pub = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  return pub.replace(/\/api\/v1\/?$/, "");
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const dest = `${upstreamBase()}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const trace =
    req.headers.get("x-trace-id") || req.headers.get("x-request-id");
  if (trace) {
    headers.set("x-trace-id", trace);
    headers.set("x-request-id", trace);
  }

  const init: RequestInit = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") {
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
  for (const c of setCookie) out.headers.append("set-cookie", c);
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
