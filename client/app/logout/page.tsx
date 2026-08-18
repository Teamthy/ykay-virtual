"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";
import { homeForRoles } from "@/hooks/useDashboardRoute";

// Dedicated logout confirmation â€” replaces window.confirm in the header
// and dashboard chrome so the choice is a real screen, not a browser dialog.

export default function LogoutPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const doLogout = useLogout();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stayHref = user ? homeForRoles(user.roles) : "/";

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await doLogout();
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Could not log out. Try again.");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Session</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">Log out of NUVORA?</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {isLoading
            ? "Checking your sessionâ€¦"
            : user
              ? `You are signed in as ${user.email}. Logging out ends this session on this device.`
              : "You are not signed in on this device."}
        </p>

        {err && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-navy px-5 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50"
              >
                {busy ? "Logging outâ€¦" : "Yes, log out"}
              </button>
              <button
                type="button"
                onClick={() => router.push(stayHref)}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-bold text-ink-800 hover:border-brand-navy"
              >
                Stay signed in
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-gold px-5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Go to log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
