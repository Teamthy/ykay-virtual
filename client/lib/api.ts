"use client";

import { v4 as uuidv4 } from "uuid";

// Minimal client per AGENTS.md: trace-id header, response envelope handling

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

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
  return uuidv4 ? uuidv4() : Math.random().toString(36).slice(2);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const traceId = getTraceId();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Trace-ID": traceId,
      "X-Request-ID": traceId,
      ...(init?.headers || {}),
    },
    credentials: "include", // httpOnly session cookie flows on every request
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new Error(errBody?.error?.message || `Request failed ${res.status}`);
  }

  return (await res.json()) as Envelope<T>;
}

export async function apiFetchSSR<T>(path: string): Promise<Envelope<T>> {
  // For SSR/SSG pages - no client uuid, use server side trace
  const traceId = `ssr-${Date.now()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Trace-ID": traceId, "X-Request-ID": traceId },
    next: { revalidate: 300 }, // ISR 5min default for catalogue
  });
  if (!res.ok) throw new Error(`SSR fetch failed ${res.status} ${path}`);
  return (await res.json()) as Envelope<T>;
}
