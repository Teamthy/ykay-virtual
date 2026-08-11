"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listProgrammes, type ProgrammeListParams } from "@/features/programmes/api/list";
import { ProgrammeCard, type ProgrammeCardData } from "@/features/programmes/components/ProgrammeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Programmes Hub (working-doc §8.2): filter bar [Curriculum][Level][Subject]
// [Format][Exam] + sidebar + cards + load more. URL-driven, SSR-friendly.

const CURRICULA = [
  { value: "british", label: "British Curriculum" },
  { value: "nigerian", label: "Nigerian Curriculum" },
];
const EXAMS = ["igcse", "waec", "neco", "jamb", "a-level", "ielts"];
const LEVELS = ["year-7-9", "igcse", "a-level", "jss1-3", "sss1-3"];
const FORMATS = ["COHORT", "PRIVATE", "BOOTCAMP", "HOLIDAY", "ONLINE_CLASS", "HYBRID"];

export function ProgrammesHub() {
  const router = useRouter();
  const sp = useSearchParams();

  const [subject, setSubject] = useState(sp.get("subject") ?? "");
  const [curriculum, setCurriculum] = useState(sp.get("curriculum") ?? "");
  const [exam, setExam] = useState(sp.get("exam") ?? "");
  const [level, setLevel] = useState(sp.get("level") ?? "");
  const [format, setFormat] = useState(sp.get("format") ?? "");
  const [search, setSearch] = useState(sp.get("q") ?? "");

  const params: ProgrammeListParams = {
    page_size: 12,
    subject: subject || undefined,
    curriculum: curriculum || undefined,
    exam: exam || undefined,
    level: level || undefined,
    format: format || undefined,
    search: search || undefined,
    sort: "newest",
  };

  const push = (next: Record<string, string>) => {
    const qs = new URLSearchParams();
    const merged = { subject, curriculum, exam, level, format, q: search, ...next };
    Object.entries(merged).forEach(([k, v]) => { if (v) qs.set(k, v); });
    router.push(`/programmes?${qs.toString()}`, { scroll: false });
  };

  const query = useInfiniteQuery({
    queryKey: ["programmes", "hub", params],
    queryFn: ({ pageParam = 1 }) => listProgrammes({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta?.has_next ? last.meta.page + 1 : undefined),
    staleTime: 120_000,
  });

  const programmes = (query.data?.pages.flatMap((p) => p.data) ?? []) as ProgrammeCardData[];

  const filterChip = (label: string, value: string, current: string, onChange: (v: string) => void, param: string) => (
    <button
      key={value}
      onClick={() => { onChange(current === value ? "" : value); push({ [param]: current === value ? "" : value }); }}
      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
        current === value ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">
      {/* Sidebar filters */}
      <aside className="border rounded-2xl p-5 space-y-5 lg:sticky lg:top-28">
        <h2 className="font-bold">Filters</h2>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Curriculum</p>
          <div className="flex flex-col gap-1.5">
            {CURRICULA.map((c) => (
              <button key={c.value} onClick={() => { setCurriculum(curriculum === c.value ? "" : c.value); push({ curriculum: curriculum === c.value ? "" : c.value }); }}
                className={`text-left text-sm rounded-xl px-3 py-2 transition-colors ${curriculum === c.value ? "bg-brand-blue text-white font-semibold" : "text-ink-700 hover:bg-ink-50"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Exam</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMS.map((e) => filterChip(e.toUpperCase(), e, exam, setExam, "exam"))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Level</p>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => filterChip(l.replace("-", " ").toUpperCase(), l, level, setLevel, "level"))}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => { setSubject(""); setCurriculum(""); setExam(""); setLevel(""); setFormat(""); setSearch(""); router.push("/programmes", { scroll: false }); }}>
          Clear all filters
        </Button>
      </aside>

      {/* Results */}
      <div>
        {/* Top filter bar */}
        <div className="flex flex-col gap-3 mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && push({ q: search })}
            placeholder="Search programmes…"
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-400 self-center">Format:</span>
            {FORMATS.map((f) => filterChip(f.replace(/_/g, " ").toLowerCase(), f, format, setFormat, "format"))}
          </div>
        </div>

        {query.isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Skeleton className="h-52 w-full" /><Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" /><Skeleton className="h-52 w-full" />
          </div>
        ) : query.isError ? (
          <div className="border rounded-2xl p-10 text-center text-red-600">Could not load programmes.</div>
        ) : programmes.length === 0 ? (
          <div className="border rounded-2xl p-12 text-center text-ink-500">
            No programmes match those filters — try clearing a filter or two.
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-500 mb-4">{query.data?.pages[0]?.meta?.total_items ?? programmes.length} programme(s)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {programmes.map((p) => <ProgrammeCard key={p.id} p={p} />)}
            </div>
            {query.hasNextPage && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? "Loading…" : "Load more programmes"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
