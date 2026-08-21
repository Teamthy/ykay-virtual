"use client";

// CurriculumLevelSelect — two linked dropdowns (curriculum → level) for a
// learner's "current level". Levels come from the public /curricula endpoint
// (Nigerian + British curricula seeded in migration 000052). The selected
// value is the level name, matching student_profiles.current_level.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type CurriculumOption = {
  id: string;
  name: string;
  slug: string;
  levels: { id: string; name: string; slug: string; sort_order: number }[];
};

export async function fetchCurricula(): Promise<CurriculumOption[]> {
  const res = await apiFetch<CurriculumOption[]>("/curricula");
  return res.data ?? [];
}

const SELECT_CLS =
  "mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30";

export function useCurricula() {
  return useQuery({
    queryKey: ["catalogue", "curricula"],
    queryFn: fetchCurricula,
    staleTime: 5 * 60_000,
  });
}

export function CurriculumLevelSelect({
  value,
  onChange,
  curriculumId,
  onCurriculumChange,
  label = "Current level",
  required = false,
}: {
  value: string;
  onChange: (levelName: string) => void;
  curriculumId?: string;
  onCurriculumChange?: (curriculumId: string) => void;
  label?: string;
  required?: boolean;
}) {
  const q = useCurricula();
  const curricula = q.data ?? [];

  // Pre-select the curriculum owning the current level value (e.g. "JSS2").
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(curriculumId ?? "");
  const [selectedLevel, setSelectedLevel] = useState<string>(value);
  // Start empty so the FIRST effect pass processes the initial value (e.g.
// "Year 8" from onboarding) and finds its owning curriculum.
const lastValueRef = useRef<string>("");

  useEffect(() => {
    if (curriculumId) setSelectedCurriculum(curriculumId);
  }, [curriculumId]);

  // Sync rules:
  //  - set the level ONLY when the parent value actually changes (never
  //    clobber the user's in-form selection with a constant empty value).
  //  - keep looking for the value's owning curriculum until it is found
  //    (the curricula list loads async after the first render).
  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      setSelectedLevel(value);
    }
    if (!selectedCurriculum && value) {
      const owner = curricula.find((c) => c.levels.some((l) => l.name === value));
      if (owner) setSelectedCurriculum(owner.id);
    }
  }, [value, curricula, selectedCurriculum]);

  const levels = useMemo(
    () => curricula.find((c) => c.id === selectedCurriculum)?.levels ?? [],
    [curricula, selectedCurriculum]
  );

  if (q.isLoading) {
    return (
      <div className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">{label}</span>
        <div className={`${SELECT_CLS} animate-pulse bg-ink-100 text-transparent`}>…</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">Curriculum</span>
        <select
          value={selectedCurriculum}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedCurriculum(id);
            onCurriculumChange?.(id);
            const c = curricula.find((x) => x.id === id);
            const newLevel = c?.levels[0]?.name ?? "";
            setSelectedLevel(newLevel);
            onChange(newLevel);
          }}
          className={SELECT_CLS}
        >
          <option value="">Select a curriculum…</option>
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">{label}</span>
        <select
          value={selectedLevel}
          required={required}
          disabled={!selectedCurriculum}
          onChange={(e) => {
            setSelectedLevel(e.target.value);
            onChange(e.target.value);
          }}
          className={SELECT_CLS}
        >
          <option value="">{selectedCurriculum ? "Select a level…" : "Choose a curriculum first"}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
