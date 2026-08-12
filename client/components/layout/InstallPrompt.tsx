"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// PWA install prompt (M1): captures the beforeinstallprompt event and shows a
// small banner so Android/Chrome users can add NUVORA to their home screen.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-24 left-4 z-40 flex max-w-xs items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-xl lg:bottom-8 lg:left-8">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gold-light text-xl" aria-hidden="true">
        📲
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-brand-navy">Install NUVORA</p>
        <p className="text-xs text-ink-500">Add to your home screen for the app experience.</p>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-lg bg-brand-gold px-3 py-1 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-400 hover:text-ink-600"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
