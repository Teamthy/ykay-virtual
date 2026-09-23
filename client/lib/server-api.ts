// Server-safe API helpers (NO "use client" - callable from RSC/SSR).
// Client-side helpers live in lib/api.ts.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * Hard per-request ceiling for server-side (RSC/SSR/SSG) fetches.
 *
 * Node's fetch has NO default timeout: a host that completes the TCP
 * handshake but never answers — a dead PaaS instance, a black-holed firewall,
 * a proxy with no upstream — leaves the promise pending for minutes. During
 * `next build` that burns Next's 60s per-route static-generation budget and
 * fails the whole deploy, which is exactly how /sitemap.xml killed the Vercel
 * build ("Failed to build /sitemap.xml/route ... took more than 60 seconds")
 * even though every caller below already degrades gracefully when the API is
 * down. Bounding the wait here means an unreachable API costs seconds instead
 * of the build. 8s is far above the API's p99 for catalogue reads; raise
 * SSR_FETCH_TIMEOUT_MS for a slow self-hosted API.
 */
export const SSR_FETCH_TIMEOUT_MS = (() => {
  const raw = Number(process.env.SSR_FETCH_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 8000;
})();

/**
 * Circuit breaker for the SSR/SSG path.
 *
 * `next build` renders ~190 pages that each read the API. Paying the full
 * timeout on every one of them turns "API is down" into a build that takes
 * `timeout × pages` (and Vercel aborts builds that drag on). After this many
 * consecutive failures the breaker opens and the remaining pages fail
 * instantly — they already render static/local content — then it half-closes
 * after the cooldown so a recovered API is picked up automatically, including
 * on ISR revalidation in a long-lived server.
 */
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 60_000;

let consecutiveFailures = 0;
let breakerOpenUntil = 0;

export type Envelope<T> = {
  data: T;
  meta?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
};

export type SsrFetchOptions = {
  /** ISR window for this fetch (default 300s = 5min catalogue cache). */
  revalidate?: number;
  /** Per-request timeout override; defaults to SSR_FETCH_TIMEOUT_MS. */
  timeoutMs?: number;
};

export async function apiFetchSSR<T>(
  path: string,
  options: SsrFetchOptions = {},
): Promise<Envelope<T>> {
  const traceId = `ssr-${Date.now()}`;
  const timeoutMs = options.timeoutMs ?? SSR_FETCH_TIMEOUT_MS;
  const revalidate = options.revalidate ?? 300; // ISR 5min default for catalogue

  if (Date.now() < breakerOpenUntil) {
    throw new Error(`SSR fetch skipped (API unavailable) ${path}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "X-Trace-ID": traceId, "X-Request-ID": traceId },
      next: { revalidate },
      // Next forwards this signal to the origin request (patch-fetch), so the
      // socket is actually released instead of left dangling. A user-supplied
      // signal does not opt the fetch out of the data cache.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // AbortSignal.timeout raises TimeoutError; DNS/refused raise TypeError.
    // Callers already try/catch and fall back to static content, but the
    // message must name the budget so build logs are diagnosable.
    tripBreaker();
    throw new Error(`SSR fetch failed (timeout ${timeoutMs}ms) ${path}: ${String(cause)}`);
  }

  if (!res.ok) {
    // A 4xx/5xx answer means the API is reachable — that is an application
    // problem (or a legitimately missing record), not an outage, so it must
    // not open the breaker.
    throw new Error(`SSR fetch failed ${res.status} ${path}`);
  }

  consecutiveFailures = 0;
  breakerOpenUntil = 0;
  return (await res.json()) as Envelope<T>;
}

function tripBreaker() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= BREAKER_THRESHOLD) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    consecutiveFailures = 0;
  }
}
