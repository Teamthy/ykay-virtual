"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpenCheck, Dices, ShieldCheck } from "lucide-react";
import { listBankSubjects } from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// /lms/practice — the shared practice bank home. Every subject card shows the
// LIVE count of published questions; a paper is a fresh random draw per
// sitting, so no two students practise the same set.

const LIMITS = [10, 20, 30, 50];

export default function PracticeBankPage() {
  const subjects = useQuery({
    queryKey: ["cbt", "bank", "subjects"],
    queryFn: listBankSubjects,
    staleTime: 60_000,
  });

  const list = subjects.data ?? [];
  const total = list.reduce((n, s) => n + s.question_count, 0);

  return (
    <DashboardPage className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
          Practice bank
        </p>
        <h1 className="mt-2 font-display text-4xl text-deep">
          Test practice, JAMB/WAEC style
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
          {total.toLocaleString()}+ exam-standard questions across{" "}
          {list.length || "13"} subjects — real past-paper patterns with
          worked explanations. Every paper is drawn at random, so{" "}
          <strong>you get different questions every sitting</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: <Dices size={16} />,
            title: "Random draw per sitting",
            desc: "A fresh subset every time — no repeats to memorise",
          },
          {
            icon: <ShieldCheck size={16} />,
            title: "Graded on the server",
            desc: "Answers can't be peeked at — score + full review on submit",
          },
          {
            icon: <BookOpenCheck size={16} />,
            title: "Explanations included",
            desc: "Every review shows why the key is right",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[--line] bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-primary-dark">
              {f.icon}
              <p className="text-sm font-bold">{f.title}</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.desc}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-deep">Choose a subject</h2>
        {subjects.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : subjects.error ? (
          <EmptyState
            title="Bank unavailable"
            description={
              subjects.error instanceof Error
                ? subjects.error.message
                : "Please try again later."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <Link
                key={s.slug}
                href={`/lms/practice/${s.slug}`}
                className="group rounded-2xl border border-[--line] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-deep group-hover:text-primary-dark">
                    {s.name}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary-dark">
                    {s.question_count} q
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize text-ink-400">
                  {s.department} · {s.class_level.toUpperCase()}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {LIMITS.slice(0, 3).map((n) => (
                      <span
                        key={n}
                        className="rounded-lg border border-[--line] px-2 py-0.5 text-[11px] font-semibold text-ink-500"
                      >
                        {n} q
                      </span>
                    ))}
                    <span className="rounded-lg border border-[--line] px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                      …more
                    </span>
                  </div>
                  <span className="text-sm font-bold text-primary-dark opacity-0 transition group-hover:opacity-100">
                    Start →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
