"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cookie consent banner (P2): shown until accepted; stored locally. Links to
// the privacy policy (cookies section).

const KEY = "nuvora-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-16 z-30 mx-auto max-w-lg rounded-2xl border border-ink-100 bg-white p-4 shadow-2xl lg:bottom-4 dark:border-ink-700 dark:bg-ink-800">
      <p className="text-sm leading-6 text-ink-700 dark:text-ink-200">
        🍪 We use a session cookie to keep you signed in and a few preferences
        (theme, language).{" "}
        <Link href="/privacy" className="font-semibold text-brand-gold-dark hover:underline">
          Learn more
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={accept}
          data-testid="cookie-accept"
          className="flex-1 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={accept}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-ink-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
