"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import {
  getMyWaitlist,
  joinWaitlist,
  leaveWaitlist,
  type WaitlistEntry,
} from "@/features/cohorts/api/waitlist";

/**
 * Cohort waitlist CTA — shown when a cohort is full. Real data only: it reads
 * the learner's actual waitlist position and never fabricates a seat count.
 */
export function WaitlistButton({ cohortId }: { cohortId: string }) {
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyWaitlist(cohortId)
      .then((e) => alive && setEntry(e))
      .catch(() => alive && setEntry(null))
      .finally(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, [cohortId]);

  async function join() {
    setBusy(true);
    try {
      setEntry(await joinWaitlist(cohortId));
    } catch {
      /* leave the prior state; the API surfaces the error to the console */
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await leaveWaitlist(cohortId);
      setEntry(null);
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }

  if (!checked) {
    return (
      <button disabled className="btn-gold w-full opacity-60 inline-flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking waitlist…
      </button>
    );
  }

  if (entry) {
    return (
      <div className="w-full rounded-2xl bg-[#D6FF57] p-4 text-[#0F2A1A]">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Check className="h-4 w-4" aria-hidden /> You&rsquo;re on the waitlist
        </p>
        <p className="mt-1 text-xs text-[#0F2A1A]/75">
          Position #{entry.position}. We&rsquo;ll notify you the moment a seat opens.
        </p>
        <button
          onClick={leave}
          disabled={busy}
          className="mt-3 w-full rounded-full border border-[#0F2A1A]/30 px-4 py-2 text-xs font-semibold text-[#0F2A1A] hover:bg-[#0F2A1A]/5 disabled:opacity-50"
        >
          {busy ? "Updating…" : "Leave waitlist"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={join}
      disabled={busy}
      className="btn-gold w-full inline-flex items-center justify-center gap-2"
    >
      <BellRing className="h-4 w-4" aria-hidden />
      {busy ? "Joining…" : "Join the waitlist"}
    </button>
  );
}
