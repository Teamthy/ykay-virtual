"use client";

// Minimal client per AGENTS.md: trace-id header, response envelope handling.
//
// Browser fetches use a RELATIVE /api/v1 base so the request goes through the
// Next.js rewrite (next.config.js) to the API - this works in local dev AND in
// the hosted preview, where an absolute localhost URL would hit the visitor's
// own machine ("Failed to fetch"). Server-side (SSR/SSG) fetches keep an
// absolute URL because the Next server CAN reach the API directly.
export const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
    : "/api/v1";

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

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
};

function getTraceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DEFAULT_TIMEOUT_MS = 20000;

// Transient-failure retry: one retry with short backoff for safe methods.
// GET is idempotent by contract; money-moving POSTs are never auto-retried
// (idempotency keys protect those server-side instead).
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRY_BACKOFF_MS = 500;

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const traceId = getTraceId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  // FormData bodies must NOT get a JSON content-type — the browser sets the
  // multipart boundary itself (CSV upload in the CBT bank console).
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  return fetch(`${API_BASE}${path}`, {
    ...init,
    signal: init?.signal ?? controller.signal,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      "X-Trace-ID": traceId,
      "X-Request-ID": traceId,
      ...(init?.headers || {}),
    },
    credentials: "include",
    cache: "no-store",
  }).finally(() => clearTimeout(timer));
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const retryable = RETRYABLE_METHODS.has(method) && !init?.signal;

  let res: Response;
  try {
    try {
      res = await rawFetch(path, init);
    } catch (e) {
      // Transient network failure / timeout on a safe method → one retry
      // with backoff (flaky mobile networks, cold Render instances).
      if (retryable && (e instanceof DOMException || e instanceof TypeError)) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        res = await rawFetch(path, init);
      } else {
        throw e;
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw e;
  }

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    window.location.assign("/login");
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new Error(errBody?.error?.message || `Request failed ${res.status}`);
  }

  return (await res.json()) as Envelope<T>;
}

export async function apiFetchSSR<T>(path: string): Promise<Envelope<T>> {
  const traceId = `ssr-${Date.now()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Trace-ID": traceId, "X-Request-ID": traceId },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`SSR fetch failed ${res.status} ${path}`);
  return (await res.json()) as Envelope<T>;
}
