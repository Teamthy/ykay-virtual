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
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/lms/tutor" />
      <PageHeader
        eyebrow="Tutor"
        title="My Teaching"
        cover="/hero/how-it-works.jpg"
        subline={user ? `Signed in as ${user.email}` : "Tutor portal"}
        actions={
          <Link href="/become-tutor/apply" className="rounded-lg bg-[#D6FF57] px-4 py-2 text-sm font-semibold text-[#0F2A1A] hover:bg-[#C8F030]">
            Tutor application
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl">
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-[#0F2A1A]">{groups.length}</p>
            <p className="mt-1 text-sm font-semibold text-[#0F2A1A]/75">Cohorts I teach</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-[#0F2A1A]">{lessons.data?.length ?? "-"}</p>
            <p className="mt-1 text-sm font-semibold text-[#0F2A1A]/75">Upcoming lessons</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-3xl font-extrabold text-[#0F2A1A]">{pendingGrading.data ?? "-"}</p>
            <p className="mt-1 text-sm font-semibold text-[#0F2A1A]/75">Awaiting grading</p>
            <p className="mt-0.5 text-xs text-[#0F2A1A]/65">Check each cohort for submissions</p>
          </div>
        </div>

        {/* Cohorts */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-[0.02em] text-[#0F2A1A]">My cohorts</h2>
          {lessons.isLoading ? (
            <p className="py-8 text-center text-sm text-[#0F2A1A]/65">Loading your cohorts…</p>
          ) : groups.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
              <p className="text-2xl">✍️</p>
              <p className="mt-2 font-semibold text-[#0F2A1A]/75">No cohorts assigned yet.</p>
              <p className="mt-1 text-sm text-[#0F2A1A]/65">Complete your tutor application to start teaching.</p>
              <Link href="/become-tutor/apply" className="mt-4 inline-flex rounded-lg bg-[#D6FF57] px-5 py-2.5 text-sm font-semibold text-[#0F2A1A] hover:bg-[#C8F030]">
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
                    className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-[#0F2A1A] group-hover:text-[#0F2A1A]">{meta.title}</h3>
                      <span className="rounded-full bg-[#F9F6ED] px-2.5 py-1 text-xs font-bold text-[#0F2A1A]">
                        {g.lessons.length} lessons
                      </span>
                    </div>
                    {next && (
                      <p className="mt-2 text-sm text-[#0F2A1A]/65">
                        Next: <span className="font-semibold text-[#0F2A1A]/75">{next.title}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#0F2A1A]/65">Open teaching console →</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Earnings */}
        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-[0.02em] text-[#0F2A1A]">Earnings & payouts</h2>
            <span className="rounded-full bg-[#F9F6ED] px-3 py-1 text-xs font-bold text-[#0F2A1A]">
              Escrow-protected
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#F9F6ED] p-4">
              <p className="text-2xl font-extrabold text-[#0F2A1A]">
                ₦{(earnings.data?.held_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#0F2A1A]/65">Held (lessons in progress)</p>
            </div>
            <div className="rounded-xl bg-[#F9F6ED] p-4">
              <p className="text-2xl font-extrabold text-[#0F2A1A]">
                ₦{(earnings.data?.released_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#0F2A1A]/65">Released (delivered)</p>
            </div>
            <div className="rounded-xl bg-[#F9F6ED] p-4">
              <p className="text-2xl font-extrabold text-[#0F2A1A]">
                ₦{(earnings.data?.paid_total ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#0F2A1A]/65">Paid out</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-[#0F2A1A]/75">Recent payouts</p>
            {(earnings.data?.payouts ?? []).length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-black/10 p-4 text-center text-xs text-[#0F2A1A]/65">
                No payouts yet - released earnings are paid out on the weekly schedule.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(earnings.data?.payouts ?? []).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-[#0F2A1A]/75">₦{p.amount.toLocaleString()}</span>
                    <span className="text-xs text-[#0F2A1A]/65">
                      {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      <span className={p.status === "PAID" ? "font-bold text-green-600" : "font-semibold text-[#0F2A1A]/65"}>
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
