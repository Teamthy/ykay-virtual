"use client";

import { useEffect, useState } from "react";
import { getDigestPrefs, setDigestPrefs, type DigestPrefs } from "@/features/learning/api/digest";

/**
 * Weekly parent progress digest toggle (feature 3). Shows the opt-in state and
 * the real last-sent date (absent until the first digest is emailed) — no
 * fabricated dates.
 */
export function DigestPrefsToggle() {
  const [prefs, setPrefs] = useState<DigestPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getDigestPrefs()
      .then((p) => alive && setPrefs(p))
      .catch(() => alive && setPrefs({ enabled: true }));
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(next: boolean) {
    if (!prefs) return;
    setSaving(true);
    // Optimistic, then reconcile with the server response.
    setPrefs({ ...prefs, enabled: next });
    try {
      const updated = await setDigestPrefs(next);
      setPrefs(updated);
    } catch {
      setPrefs(prefs); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  if (prefs === null) {
    return <p className="text-sm text-[#0F2A1A]/60">Loading digest settings…</p>;
  }

  const lastSent = prefs.last_sent_at ? new Date(prefs.last_sent_at) : null;

  return (
    <div className="rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-[#0F2A1A]/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#0F2A1A]">Weekly progress digest</h3>
          <p className="mt-1 max-w-md text-sm text-[#0F2A1A]/70">
            A plain-language email each week summarising your learners&rsquo;
            practice activity — quiz attempts and average scores since the last
            digest. Learners with no activity are reported as such.
          </p>
          <p className="mt-2 text-xs text-[#0F2A1A]/50">
            {lastSent
              ? `Last digest sent ${lastSent.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.`
              : "No digest sent yet."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          aria-label="Weekly progress digest"
          disabled={saving}
          onClick={() => toggle(!prefs.enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            prefs.enabled ? "bg-[#D6FF57]" : "bg-[#0F2A1A]/15"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-[#0F2A1A] transition-transform ${
              prefs.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
