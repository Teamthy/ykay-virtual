"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listProgrammes, type ProgrammeListParams } from "@/features/programmes/api/list";
import { ProgrammeCard, type ProgrammeCardData } from "@/features/programmes/components/ProgrammeCard";
import { hideDemo } from "@/lib/content-filter";
import { Skeleton } from "@/components/ui/skeleton";

const CURRICULA = [
  { value: "british", label: "British Curriculum" },
  { value: "nigerian", label: "Nigerian Curriculum" },
];
const EXAMS = ["igcse", "waec", "neco", "jamb", "a-level"];
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

  const programmes = hideDemo((query.data?.pages.flatMap((p) => p.data) ?? []) as ProgrammeCardData[]);
  const hasFilters = Boolean(subject || curriculum || exam || level || format || search);

  const clear = () => {
    setSubject("");
    setCurriculum("");
    setExam("");
    setLevel("");
    setFormat("");
    setSearch("");
    router.push("/programmes", { scroll: false });
  };

  const toggle = (current: string, value: string, set: (v: string) => void, param: string) => {
    const next = current === value ? "" : value;
    set(next);
    push({ [param]: next });
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_8px_28px_rgba(15,42,26,0.05)] lg:sticky lg:top-28">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] uppercase text-[#0F2A1A]">Filters</h2>
          {hasFilters && (
            <button type="button" onClick={clear} className="text-[12px] font-bold text-[#0F2A1A] underline-offset-2 hover:underline">
              Clear
            </button>
          )}
        </div>

        <FilterBlock label="Curriculum">
          <div className="flex flex-col gap-1.5">
            {CURRICULA.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(curriculum, c.value, setCurriculum, "curriculum")}
                className={chip(curriculum === c.value, "justify-start px-3 py-2 text-left text-[13px]")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </FilterBlock>

        <FilterBlock label="Exam">
          <div className="flex flex-wrap gap-1.5">
            {EXAMS.map((e) => (
              <button key={e} type="button" onClick={() => toggle(exam, e, setExam, "exam")} className={chip(exam === e)}>
                {e.toUpperCase()}
              </button>
            ))}
          </div>
        </FilterBlock>

        <FilterBlock label="Level">
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <button key={l} type="button" onClick={() => toggle(level, l, setLevel, "level")} className={chip(level === l)}>
                {l.replace(/-/g, " ").toUpperCase()}
              </button>
            ))}
          </div>
        </FilterBlock>
      </aside>

      <div>
        <div className="mb-5 flex flex-col gap-3">
          <label className="block">
            <span className="sr-only">Search programmes</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && push({ q: search })}
              placeholder="Search programmes…"
              className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm text-[#0F2A1A] outline-none placeholder:text-[#0F2A1A]/40 focus:border-[#0F2A1A] focus:ring-2 focus:ring-[#D6FF57]/40"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/50">Format</span>
            {FORMATS.map((f) => (
              <button key={f} type="button" onClick={() => toggle(format, f, setFormat, "format")} className={chip(format === f)}>
                {f.replace(/_/g, " ").toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
          </div>
        ) : query.isError ? (
          <EmptyPanel
            title="Could not load programmes"
            body="The catalogue didn't respond. Try again in a moment — this list only shows published programmes, never sample prices."
          />
        ) : programmes.length === 0 ? (
          <EmptyPanel
            title={hasFilters ? "No programmes match those filters" : "No programmes are published yet"}
            body={
              hasFilters
                ? "Clear a filter or two. If a live cohort, bootcamp or class matches, it will show here with its real fee."
                : "When a programme is published it will appear here with its format, fee and next start. We don't fill the gap with sample tracks."
            }
            action={hasFilters ? { label: "Clear filters", onClick: clear } : undefined}
          />
        ) : (
          <>
            <p className="mb-4 text-[13px] text-[#0F2A1A]/60">
              Showing {programmes.length} published programme{programmes.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {programmes.map((p) => <ProgrammeCard key={p.id} p={p} />)}
            </div>
            {query.hasNextPage && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="rounded-full border border-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#0F2A1A] hover:text-white disabled:opacity-50"
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more programmes"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/50">{label}</p>
      {children}
    </div>
  );
}

function chip(on: boolean, extra = "") {
  return `rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${extra} ${
    on ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-[#F9F6ED] text-[#0F2A1A]/75 hover:bg-[#F0EDDF]"
  }`;
}

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white px-6 py-12 text-center">
      <h3 className="font-display text-[28px] uppercase text-[#0F2A1A]">{title}</h3>
      <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {action && (
          <button type="button" onClick={action.onClick} className="rounded-full bg-[#D6FF57] px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A]">
            {action.label}
          </button>
        )}
        <Link href="/exam-prep" className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A]">
          Exam preparation <ArrowRight size={13} />
        </Link>
        <Link href="/private-tuition" className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A]">
          Private tuition
        </Link>
      </div>
    </div>
  );
}
