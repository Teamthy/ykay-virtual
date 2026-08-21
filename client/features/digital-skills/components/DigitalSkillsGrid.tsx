"use client";

// DigitalSkillsGrid — filterable course cards for the digital-skills hub.
// Each card deep-links to its own course page (/digital-skills/[slug]).

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Brain, Clock, Code, Cpu, FileText, Keyboard, Shield, Users,
} from "lucide-react";
import { DIGITAL_COURSES, type DigitalCourse } from "@/features/digital-skills/courses";

const ICONS: Record<DigitalCourse["icon"], typeof Cpu> = {
  cpu: Cpu,
  keyboard: Keyboard,
  code: Code,
  brain: Brain,
  shield: Shield,
  file: FileText,
};

const LEVELS = ["All levels", "Beginner", "Intermediate", "Advanced"] as const;

export function DigitalSkillsGrid() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("All levels");
  const courses = DIGITAL_COURSES.filter((c) => level === "All levels" || c.level === level);

  return (
    <div>
      {/* Level filter */}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by level">
        {LEVELS.map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={level === l}
            onClick={() => setLevel(l)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              level === l
                ? "bg-primary text-ink-900"
                : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const Icon = ICONS[c.icon];
          return (
            <Link
              key={c.slug}
              href={`/digital-skills/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card"
            >
              {/* Accent header */}
              <div className="flex items-center gap-4 p-5" style={{ background: `${c.color}0D` }}>
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: c.color }}
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-deep">{c.title}</p>
                  <span
                    className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ background: c.color }}
                  >
                    {c.level}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-relaxed text-ink-600">{c.tagline}</p>

                <div className="mt-4 space-y-1.5 text-xs text-ink-500">
                  <p className="flex items-center gap-2"><Clock size={13} /> {c.duration}</p>
                  <p className="flex items-center gap-2"><Users size={13} /> {c.ages}</p>
                  <p className="flex items-center gap-2"><Code size={13} /> {c.skills.slice(0, 3).join(" · ")}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-ink-50 pt-4">
                  <span className="text-sm font-bold text-deep">{c.price}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-dark group-hover:gap-2 transition-all">
                    View course <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
