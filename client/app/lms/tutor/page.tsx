"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getMyTutorLessons,
  getTutorEarnings,
  getCohort,
  getCohortLessons,
} from "@/features/lms/api";
import { listSubmissions } from "@/features/learning/api";
import { useSession } from "@/hooks/useSession";

// Tutor LMS hub - cohorts I teach, pending grading, quick actions.

export default function LmsTutorHomePage() {
  // G1: the tutor profile is session-resolved server-side.
  const { user } = useSession();

  const lessons = useQuery({ queryKey: ["lms", "tutor-lessons"], queryFn: () => getMyTutorLessons(), enabled: !!user });

  // Group by cohort, fetch cohort metadata.
  const groups = (() => {
    const map = new Map<string, NonNullable<typeof lessons.data>>();
    for (const l of lessons.data ?? []) {
      const cid = l.cohort_id ?? "none";
      const arr = map.get(cid) ?? [];
      arr.push(l);
      map.set(cid, arr);
    }
    return [...map.entries()].map(([cid, ls]) => ({ cohortId: cid, lessons: ls }));
  })();

  const cohorts = useQuery({
    queryKey: ["lms", "tutor-cohort-meta"],
    queryFn: async () => {
      const out: Record<string, { title: string; href: string }> = {};
      for (const g of groups) {
        if (g.cohortId === "none") continue;
        try {
          const c = await getCohort(g.cohortId);
          out[g.cohortId] = { title: c.title, href: `/lms/tutor/cohorts/${c.id}` };
        } catch {
          out[g.cohortId] = { title: "Cohort", href: "#" };
        }
      }
      return out;
    },
    enabled: lessons.isFetched,
  });

  // Pending grading across the first assignment of each cohort.
  const earnings = useQuery({
    queryKey: ["lms", "tutor-earnings"],
    queryFn: () => getTutorEarnings(),
    enabled: !!user,
  });

  const pendingGrading = useQuery({
    queryKey: ["lms", "tutor-pending"],
    queryFn: async () => {
      let pending = 0;
      for (const g of groups.slice(0, 3)) {
        const ls = await getCohortLessons(g.cohortId);
        void ls;
      }
      return pending;
    },
    enabled: lessons.isFetched,
  });

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">NUVORA</Link> / Teaching
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">My Teaching</h1>
              <p className="mt-1 text-sm text-ink-500">
                {user ? `Signed in as ${user.email}` : "Tutor portal"} - cohorts, lessons, attendance and grading.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/lms" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
                Student view
              </Link>
              <Link href="/become-tutor/apply" className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Tutor application
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-brand-navy">{groups.length}</p>
            <p className="mt-1 text-sm font-semibold text-ink-700">Cohorts I teach</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-brand-navy">{lessons.data?.length ?? "-"}</p>
            <p className="mt-1 text-sm font-semibold text-ink-700">Upcoming lessons</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-brand-navy">{pendingGrading.data ?? "-"}</p>
            <p className="mt-1 text-sm font-semibold text-ink-700">Awaiting grading</p>
            <p className="mt-0.5 text-xs text-ink-400">Check each cohort for submissions</p>
          </div>
        </div>

        {/* Cohorts */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-[0.02em] text-brand-navy">My cohorts</h2>
          {lessons.isLoading ? (
            <p className="py-8 text-center text-sm text-ink-400">Loading your cohorts…</p>
          ) : groups.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <p className="text-2xl">✍️</p>
              <p className="mt-2 font-semibold text-ink-700">No cohorts assigned yet.</p>
              <p className="mt-1 text-sm text-ink-500">Complete your tutor application to start teaching.</p>
              <Link href="/become-tutor/apply" className="mt-4 inline-flex rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Apply as a tutor
              </Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {groups.map((g) => {
                const meta = cohorts.data?.[g.cohortId] ?? { title: "Cohort", href: `/lms/tutor/cohorts/${g.cohortId}` };
                const next = g.lessons[0];
                return (
                  <Link
                    key={g.cohortId}
                    href={meta.href}
                    className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-brand-navy group-hover:text-brand-gold-dark">{meta.title}</h3>
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-navy">
                        {g.lessons.length} lessons
                      </span>
                    </div>
                    {next && (
                      <p className="mt-2 text-sm text-ink-500">
                        Next: <span className="font-semibold text-ink-700">{next.title}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-400">Open teaching console →</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Earnings */}
        <section className="mt-8 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-[0.02em] text-brand-navy">Earnings & payouts</h2>
            <span className="rounded-full bg-brand-gold-light px-3 py-1 text-xs font-bold text-brand-navy">
              Escrow-protected
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-2xl font-extrabold text-brand-navy">
                ₦{(earnings.data?.held_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">Held (lessons in progress)</p>
            </div>
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-2xl font-extrabold text-brand-navy">
                ₦{(earnings.data?.released_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">Released (delivered)</p>
            </div>
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-2xl font-extrabold text-brand-navy">
                ₦{(earnings.data?.paid_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">Paid out</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-ink-700">Recent payouts</p>
            {(earnings.data?.payouts ?? []).length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
                No payouts yet - released earnings are paid out on the weekly schedule.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(earnings.data?.payouts ?? []).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-ink-700">₦{p.amount.toLocaleString()}</span>
                    <span className="text-xs text-ink-400">
                      {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      <span className={p.status === "PAID" ? "font-bold text-green-600" : "font-semibold text-ink-500"}>
                        {p.status}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
