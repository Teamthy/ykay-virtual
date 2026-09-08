"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpenCheck, Dices, Search, ShieldCheck } from "lucide-react";
import { listBankSubjects } from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const LIMITS = [10, 20, 30, 50];

const LEVEL_ORDER = [
  "jss1",
  "jss2",
  "jss3",
  "bece",
  "ss1",
  "ss2",
  "ss3",
  "waec",
  "neco",
  "jamb",
] as const;

const LEVEL_LABELS: Record<string, string> = {
  jss1: "Junior — JSS1",
  jss2: "Junior — JSS2",
  jss3: "Junior — JSS3",
  bece: "BECE",
  ss1: "Senior — SS1",
  ss2: "Senior — SS2",
  ss3: "Senior — SS3",
  waec: "WAEC",
  neco: "NECO",
  jamb: "JAMB UTME",
};

export default function PracticeBankPage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");

  const subjects = useQuery({
    queryKey: ["cbt", "bank", "subjects"],
    queryFn: listBankSubjects,
    staleTime: 60_000,
  });

  const list = subjects.data ?? [];
  const total = list.reduce((n, s) => n + s.question_count, 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((s) => {
      if (level !== "all" && s.class_level !== level) return false;
      if (!needle) return true;
      return (
        s.name.toLowerCase().includes(needle) ||
        s.slug.toLowerCase().includes(needle) ||
        s.department.toLowerCase().includes(needle) ||
        s.class_level.toLowerCase().includes(needle)
      );
    });
  }, [list, q, level]);

  const levelsPresent = LEVEL_ORDER.filter((lv) =>
    filtered.some((s) => s.class_level === lv),
  );
  const extraLevels = [
    ...new Set(
      filtered
        .map((s) => s.class_level)
        .filter((lv) => !(LEVEL_ORDER as readonly string[]).includes(lv)),
    ),
  ];

  return (
    <DashboardPage className="space-y-8">
      <div className="relative isolate overflow-hidden rounded-3xl bg-deep px-6 py-10 text-white md:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/ribs-green.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/90 to-deep/65" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            CBT Practice
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">
            Sit a paper. Get your score.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            Timed JAMB/WAEC-style practice. Pick a subject, set the length and
            difficulty, submit, and review every question with explanations.
            {total > 0
              ? ` ${total.toLocaleString()} published questions across JSS1–SS3, BECE, WAEC, NECO and JAMB.`
              : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: <Dices size={16} />,
            title: "Fresh paper every sitting",
            desc: "A random set each time — nothing to memorise",
          },
          {
            icon: <ShieldCheck size={16} />,
            title: "Graded on the server",
            desc: "Answers stay hidden until you submit",
          },
          {
            icon: <BookOpenCheck size={16} />,
            title: "Instant review",
            desc: "Score plus why the key is right",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm"
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-2xl text-deep">Choose a subject</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search subjects…"
                className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-64"
              />
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 outline-none focus:border-primary"
            >
              <option value="all">All levels</option>
              {LEVEL_ORDER.map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_LABELS[lv]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {subjects.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : subjects.error ? (
          <EmptyState
            title="Practice isn't available just now"
            description="We couldn't load subjects. Check your connection and try again — this is not a question list, it's the paper picker."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching subjects"
            description={
              q
                ? `Nothing matches “${q}”. Try another name or clear the search.`
                : "No subjects are published yet. Your school will add them here."
            }
          />
        ) : (
          <div className="space-y-10">
            {[...levelsPresent, ...extraLevels].map((lv) => (
              <div key={lv}>
                <h3 className="mb-3 font-display text-xl text-deep">
                  {LEVEL_LABELS[lv] ?? lv.toUpperCase()}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered
                    .filter((s) => s.class_level === lv)
                    .map((s) => (
                      <Link
                        key={s.slug}
                        href={`/lms/practice/${s.slug}`}
                        className="group rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-deep group-hover:text-primary-dark">
                            {s.name}
                          </p>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary-dark">
                            Start
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
                                className="rounded-lg border border-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-500"
                              >
                                {n} q
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-bold text-primary-dark opacity-0 transition group-hover:opacity-100">
                            Sit paper →
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
