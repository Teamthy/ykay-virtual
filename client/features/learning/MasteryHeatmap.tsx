"use client";

import { useEffect, useState } from "react";
import { getMastery, masteryBand, type TopicMastery } from "@/features/learning/api/mastery";

const BAND_CLASS: Record<ReturnType<typeof masteryBand>, string> = {
  strong: "bg-[#D6FF57] text-[#0F2A1A]", // lime + dark text
  developing: "bg-[#F9F6ED] text-[#0F2A1A] border border-[#0F2A1A]/10", // cream
  needs: "bg-amber-200 text-[#0F2A1A]", // amber = needs work, dark text
};

/**
 * Topic-mastery heatmap (feature 2). Groups cells by subject; each cell shows
 * the real mastery % with an accessible label. Empty state when no data — never
 * fabricated scores.
 */
export function MasteryHeatmap({
  subject,
  studentProfileId,
}: {
  subject?: string;
  studentProfileId?: string;
}) {
  const [cells, setCells] = useState<TopicMastery[] | null>(null);

  useEffect(() => {
    let alive = true;
    getMastery({ subject, studentProfileId })
      .then((c) => alive && setCells(c))
      .catch(() => alive && setCells([]));
    return () => {
      alive = false;
    };
  }, [subject, studentProfileId]);

  if (cells === null) return <p className="text-sm text-[#0F2A1A]/60">Loading mastery…</p>;
  if (cells.length === 0) {
    return (
      <p className="text-sm text-[#0F2A1A]/60">
        No practice data yet. Complete a CBT or past-paper set and your topic
        mastery will appear here.
      </p>
    );
  }

  const bySubject = cells.reduce<Record<string, TopicMastery[]>>((acc, c) => {
    (acc[c.subject] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(bySubject).map(([subj, list]) => (
        <div key={subj}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0F2A1A]/70">
            {subj}
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((c) => (
              <div
                key={`${c.subject}-${c.topic}`}
                className={`rounded-xl px-3 py-2 ${BAND_CLASS[masteryBand(c.mastery)]}`}
                title={`${c.correct}/${c.attempts} correct`}
              >
                <div className="truncate text-xs font-semibold">{c.topic}</div>
                <div className="text-lg font-extrabold leading-tight">{c.mastery}%</div>
                <div className="text-[10px] opacity-70">{c.attempts} attempts</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 text-[11px] text-[#0F2A1A]/70">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#D6FF57]" /> Strong (75%+)</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#F9F6ED] border border-[#0F2A1A]/10" /> Developing</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-200" /> Needs work</span>
      </div>
    </div>
  );
}
