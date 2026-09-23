"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cookie consent banner (P2): shown until accepted; stored locally. Links to
// the privacy policy (cookies section).

const KEY = "yk-virtual-cookie-consent";

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
    <div className="fixed inset-x-4 bottom-16 z-30 mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-4 shadow-2xl lg:bottom-4  ">
      <p className="text-sm leading-6 text-[#0F2A1A]/75 ">
        🍪 We use a session cookie to keep you signed in and a few preferences
        (theme, language).{" "}
        <Link
          href="/privacy"
          className="font-semibold text-[#0F2A1A] hover:underline"
        >
          Learn more
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={accept}
          data-testid="cookie-accept"
          className="flex-1 rounded-lg bg-[#D6FF57] px-4 py-2 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030]"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={accept}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[#0F2A1A]/70 hover:border-black/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
