"use client";

import { useEffect, useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";

// Modal confirmation — stays on the current screen (not /logout).

export function LogoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, isLoading } = useSession();
  const doLogout = useLogout();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/50"
        aria-label="Stay signed in"
        disabled={busy}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
          Session
        </p>
        <h2
          id="logout-title"
          className="mt-2 font-display text-3xl tracking-[0.02em] text-deep"
        >
          Log out of YK-Virtual?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {isLoading
            ? "Checking your session…"
            : user
              ? `You are signed in as ${user.email}. Logging out ends this session on this device.`
              : "You are not signed in on this device."}
        </p>
        {err && (
          <p
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
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
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-deep px-5 text-sm font-bold text-white hover:bg-deep/90 disabled:opacity-50"
              >
                {busy ? "Logging out…" : "Yes, log out"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-bold text-ink-800 hover:border-deep"
              >
                Stay signed in
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-ink-900 hover:bg-primary-hover"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
