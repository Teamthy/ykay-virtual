"use client";

import { ArrowRight } from "lucide-react";

/**
 * Home bridge to Ykay College — the campus school of the Ykay family.
 *
 * Full-bleed deep-green band, edge to edge, in normal document flow.
 * Gives homepage visitors a direct, premium path to the college site
 * (JSS1–SS3 campus school in Sango Ota) and makes the two sites read
 * as one brand.
 */
export function CollegeBridge() {
  const COLLEGE_URL =
    process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

  return (
    <section className="relative w-full overflow-hidden bg-deep-green py-16 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between md:px-10">
        <div className="max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            The Ykay family · Campus
          </span>
          <h2 className="font-display text-[clamp(2.25rem,6vw,5rem)] leading-[0.86] tracking-[-0.015em] text-white">
            YKAY
            <span className="block text-primary">COLLEGE</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Our campus school in Sango Ota, Ogun State — JSS1 to SS3 with science
            laboratories, sports, clubs and a full IT academy built into the timetable.
          </p>
        </div>

        <div className="shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
            >
              Visit Ykay College <ArrowRight size={14} />
            </a>
            <a
              href="/college"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/20"
            >
              What is it?
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
