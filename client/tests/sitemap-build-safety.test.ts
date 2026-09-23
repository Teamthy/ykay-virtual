// @vitest-environment node
//
// /sitemap.xml must never be able to fail (or hang) a `next build`.
//
// Regression: the sitemap route issues four live API reads (tutors, subjects,
// programmes, blog). Node's fetch has NO default timeout, so when the API host
// accepts the connection but never answers, the route outlived Next's 60s
// per-route static-generation budget and the whole Vercel deploy died with
//
//   Failed to build /sitemap.xml/route: /sitemap.xml (attempt 1 of 3) ...
//   Export encountered an error on /sitemap.xml/route, exiting the build.
//
// apiFetchSSR now hard-bounds every server-side read (SSR_FETCH_TIMEOUT_MS,
// 8s by default) and trips a breaker once the API is known dead, so the rest
// of the build fails fast instead of paying the timeout on every page.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://virtual.ykaycollege.com";
const TIMEOUT_MS = 1200;

let fetchCalls: string[] = [];

/** A "black-holed" API: accepts the request, never answers, honours aborts. */
function hangingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  fetchCalls.push(String(input));
  return new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return; // no timeout at all → stays pending forever (the old bug)
    if (signal.aborted) return reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason));
  });
}

describe("sitemap build safety", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchCalls = [];
    process.env.SSR_FETCH_TIMEOUT_MS = String(TIMEOUT_MS);
    process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:9/api/v1"; // nothing listens here
    vi.stubGlobal("fetch", vi.fn(hangingFetch));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SSR_FETCH_TIMEOUT_MS;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("still generates the static half of the sitemap when the API never answers", async () => {
    const sitemap = (await import("@/app/sitemap")).default;

    const started = Date.now();
    const entries = await sitemap();
    const elapsed = Date.now() - started;

    // Four parallel reads, each capped at TIMEOUT_MS — orders of magnitude
    // inside Next's 60s per-route budget.
    expect(elapsed).toBeLessThan(5000);
    expect(fetchCalls).toHaveLength(4);
    expect(fetchCalls.every((u) => u.includes("/api/v1/"))).toBe(true);

    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE}/`);
    expect(urls).toContain(`${SITE}/tutors`);
    expect(urls).toContain(`${SITE}/help`);
    // No live rows → no detail URLs, but the file still renders.
    expect(urls.some((u) => u.startsWith(`${SITE}/tutors/`))).toBe(false);
  });

  it("stops paying the timeout once the API is known to be unreachable", async () => {
    const { apiFetchSSR } = await import("@/lib/server-api");
    const sitemap = (await import("@/app/sitemap")).default;

    await sitemap(); // the four timeouts above trip the breaker
    const callsAfterSitemap = fetchCalls.length;

    // The next page in the build must fail fast, not wait another 8s.
    const started = Date.now();
    await expect(apiFetchSSR("/subjects")).rejects.toThrow(/API unavailable/);
    expect(Date.now() - started).toBeLessThan(250);
    expect(fetchCalls).toHaveLength(callsAfterSitemap);
  });
});
