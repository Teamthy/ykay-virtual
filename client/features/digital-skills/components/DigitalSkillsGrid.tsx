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
                ? "bg-[#D6FF57] text-[#0F2A1A]"
                : "border border-black/10 bg-white text-[#0F2A1A]/70 hover:border-black/10"
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
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card"
            >
              {/* Accent header */}
              <div className="flex items-center gap-4 bg-[#F9F6ED] p-5">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-[#0F2A1A]">{c.title}</p>
                  <span
                    className="mt-0.5 inline-block rounded-full bg-[#D6FF57] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A]"
                  >
                    {c.level}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-relaxed text-[#0F2A1A]/70">{c.tagline}</p>

                <div className="mt-4 space-y-1.5 text-xs text-[#0F2A1A]/65">
                  <p className="flex items-center gap-2"><Clock size={13} /> {c.duration}</p>
                  <p className="flex items-center gap-2"><Users size={13} /> {c.ages}</p>
                  <p className="flex items-center gap-2"><Code size={13} /> {c.skills.slice(0, 3).join(" · ")}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="text-sm font-bold text-[#0F2A1A]">{c.price}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F2A1A] group-hover:gap-2 transition-all">
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
