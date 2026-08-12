// Server-safe API helpers (NO "use client" — callable from RSC/SSR).
// Client-side helpers live in lib/api.ts.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

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

export async function apiFetchSSR<T>(path: string): Promise<Envelope<T>> {
  const traceId = `ssr-${Date.now()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Trace-ID": traceId, "X-Request-ID": traceId },
    next: { revalidate: 300 }, // ISR 5min default for catalogue
  });
  if (!res.ok) throw new Error(`SSR fetch failed ${res.status} ${path}`);
  return (await res.json()) as Envelope<T>;
}
