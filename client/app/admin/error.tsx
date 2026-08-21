"use client";

// Admin segment error boundary — an unhandled runtime error surfaces a
// friendly panel (instead of the default "Something went wrong" page) with
// the actual message so it can be reported and fixed.

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("admin page error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-card">
        <p className="text-4xl" aria-hidden="true">⚠️</p>
        <h1 className="mt-3 font-display text-2xl text-brand-navy">This page hit a snag</h1>
        <p className="mt-2 text-sm text-ink-600">
          The error was logged to the browser console (F12 → Console). If it keeps happening,
          copy the message and send it to the engineering team.
        </p>
        <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-left font-mono text-xs text-red-600">
          {error.message || "Unknown runtime error"}
          {error.digest ? ` (digest ${error.digest})` : ""}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-brand-gold px-6 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
          >
            Reload this page
          </button>
          <a href="/admin" className="rounded-full border border-ink-200 px-6 py-2.5 text-sm font-semibold text-ink-700">
            Back to admin home
          </a>
        </div>
        <p className="mt-6 text-xs text-ink-400">
          Common cause: session expired on a different domain (cookie) — try logging in again.
        </p>
      </div>
    </main>
  );
}
