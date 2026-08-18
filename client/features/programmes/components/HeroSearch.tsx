"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Home hero search (working-doc §8.1): Subject + Curriculum/Exam + Level.
// Routes to the programmes hub with URL-driven filters - never a dead end.

const CURRICULA = [
  { value: "british", label: "British Curriculum" },
  { value: "nigerian", label: "Nigerian Curriculum" },
];
const EXAMS = [
  { value: "igcse", label: "IGCSE" },
  { value: "waec", label: "WAEC" },
  { value: "neco", label: "NECO" },
  { value: "jamb", label: "JAMB / UTME" },
  { value: "a-level", label: "A-Level" },
  { value: "ielts", label: "IELTS" },
];
const LEVELS = [
  "year-7-9", "igcse", "a-level", "jss1-3", "sss1-3", "adult",
];
const LEVEL_LABELS: Record<string, string> = {
  "year-7-9": "Year 7-9", igcse: "IGCSE (Y10-11)", "a-level": "A-Level",
  "jss1-3": "JSS1-3", "sss1-3": "SSS1-3", adult: "Adult / professional",
};

export function HeroSearch() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [path, setPath] = useState("british");
  const [level, setLevel] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (subject.trim()) qs.set("subject", subject.trim());
    if (path === "british" || path === "nigerian") qs.set("curriculum", path);
    if (EXAMS.some((x) => x.value === path)) qs.set("exam", path);
    if (level) qs.set("level", level);
    router.push(`/programmes?${qs.toString()}`);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white/95 backdrop-blur p-3 shadow-lift flex flex-col md:flex-row gap-2">
      {/* Subject */}
      <div className="flex-1 flex items-center gap-3 px-4 py-2.5">
        <Search size={16} className="text-brand-blue shrink-0" />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Mathematics, Computer Science)"
          className="w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
        />
      </div>
      {/* Curriculum / Exam */}
      <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-ink-100 px-4 py-2.5">
        <select
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="bg-transparent text-sm font-semibold text-ink-700 focus:outline-none cursor-pointer"
          aria-label="Curriculum or exam"
        >
          <optgroup label="Curriculum">
            {CURRICULA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </optgroup>
          <optgroup label="Exam">
            {EXAMS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </optgroup>
        </select>
      </div>
      {/* Level */}
      <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-ink-100 px-4 py-2.5">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="bg-transparent text-sm text-ink-700 focus:outline-none cursor-pointer"
          aria-label="Level"
        >
          <option value="">Any level</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-gold whitespace-nowrap">
        Find a programme
      </button>
    </form>
  );
}
