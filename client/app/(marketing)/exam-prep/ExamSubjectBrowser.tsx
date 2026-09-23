"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EXAM_MATRIX } from "@/lib/exam-prep-data";

export function ExamSubjectBrowser() {
  const [active, setActive] = useState<string>("all");
  const exams = useMemo(
    () => (active === "all" ? EXAM_MATRIX : EXAM_MATRIX.filter((e) => e.slug === active)),
    [active],
  );

  return (
    <section className="w-full bg-[#F9F6ED] py-14 lg:py-20">
      <div className="container-x">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/55">Browse the syllabus</p>
        <h2 className="mt-3 max-w-[18ch] font-display text-[clamp(2rem,4vw,3.4rem)] uppercase leading-[0.95] text-[#0F2A1A]">
          Pick an exam, then a subject
        </h2>
        <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">
          Each subject page describes the published paper structure and the topics it covers. It is a map of the exam, not a predicted grade.
        </p>

        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by exam">
          <FilterChip label="All exams" on={active === "all"} onClick={() => setActive("all")} />
          {EXAM_MATRIX.map((exam) => (
            <FilterChip
              key={exam.slug}
              label={exam.code}
              on={active === exam.slug}
              onClick={() => setActive(exam.slug)}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {exams.map((exam) => (
            <article key={exam.slug} className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_8px_28px_rgba(15,42,26,0.05)]">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[28px] uppercase leading-none text-[#0F2A1A]">{exam.code}</h3>
                <span className="text-[12px] font-semibold text-[#0F2A1A]/55">{exam.name}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {exam.subjects.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/exam-prep/${exam.slug}/${s.slug}`}
                    className="rounded-full border border-black/10 bg-[#F9F6ED] px-3 py-1.5 text-[12px] font-semibold text-[#0F2A1A] transition hover:border-[#0F2A1A] hover:bg-[#D6FF57]"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={
        on
          ? "rounded-full bg-[#D6FF57] px-4 py-2 text-[12px] font-bold text-[#0F2A1A]"
          : "rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] font-semibold text-[#0F2A1A]/75 hover:border-[#0F2A1A]/30"
      }
    >
      {label}
    </button>
  );
}
