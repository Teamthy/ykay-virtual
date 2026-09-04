"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";

// PWA install prompt: captures the beforeinstallprompt event and shows a
// small banner so Android/Chrome users can add YK-Virtual to their home
// screen. iOS Safari never fires that event, so iPhone/iPad users get the
// Share → Add to Home Screen instruction card instead. Dismissal is
// remembered for 3 days.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ykv-install-dismissed-at";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && "ontouchend" in document)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we know better

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (Date.now() - at < COOLDOWN_MS) return;
    } catch {
      /* private mode — carry on */
    }
    if (isStandalone()) return;

    setDismissed(false);

    if (isIOS()) {
      const t = window.setTimeout(() => setShowIOS(true), 2500);
      return () => window.clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setShowIOS(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setDeferred(null);
  };

  if (dismissed) return null;
  if (!deferred && !showIOS) return null;

  return (
    <div className="fixed bottom-24 left-4 z-40 flex max-w-xs items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-xl lg:bottom-8 lg:left-8">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-xl"
        aria-hidden="true"
      >
        📲
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-deep">Install YK-Virtual</p>
        {deferred ? (
          <>
            <p className="text-xs text-ink-500">
              Add to your home screen for the app experience.
            </p>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-ink-900 hover:bg-primary-hover"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-400 hover:text-ink-600"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-ink-500">On your iPhone or iPad:</p>
            <ol className="mt-1 list-none space-y-1 text-xs text-ink-500">
              <li className="flex items-center gap-1 font-semibold text-deep">
                1. Tap <Share size={12} className="inline" /> Share
              </li>
              <li className="flex items-center gap-1 font-semibold text-deep">
                2. Tap <Plus size={12} className="inline" /> Add to Home Screen
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="mt-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ink-400 hover:text-ink-600"
            >
              Not now
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
