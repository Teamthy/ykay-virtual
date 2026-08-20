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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const traceId = getTraceId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Trace-ID": traceId,
        "X-Request-ID": traceId,
        ...(init?.headers || {}),
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw e;
  }
  clearTimeout(timer);

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
