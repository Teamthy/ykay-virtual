"use client";

import { ArrowRight, Beaker, Dumbbell, GraduationCap, Laptop } from "lucide-react";

/**
 * Home bridge to Ykay College — full-bleed campus photograph with a deep-green
 * overlay. Edge to edge, brand-locked, no placeholders.
 */
export function CollegeBridge() {
  const COLLEGE_URL =
    process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

  return (
    <section className="relative w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home/ykay-students.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-deep-green/88" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(112,242,80,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <GraduationCap size={12} /> The Ykay family · Campus
          </span>
          <h2 className="font-display text-[clamp(2.4rem,6.5vw,5.4rem)] leading-[0.88] tracking-[-0.015em] text-white">
            YKAY
            <span className="block text-primary">COLLEGE</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
            Our campus school in Sango Ota, Ogun State — JSS1 to SS3 with
            science laboratories, sports, clubs and a full IT academy built into
            the timetable. One family, one standard, on campus and online.
          </p>

          <ul className="mt-6 grid grid-cols-2 gap-3 text-xs font-semibold text-white/85 sm:max-w-md">
            {[
              { icon: Beaker, label: "Science laboratories" },
              { icon: Dumbbell, label: "Sports & clubs" },
              { icon: Laptop, label: "IT academy on timetable" },
              { icon: GraduationCap, label: "JSS1 — SS3" },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <item.icon size={14} className="text-primary" />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-deep-green shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
            >
              Visit Ykay College <ArrowRight size={14} />
            </a>
            <a
              href="/college"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/20"
            >
              What is it?
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-primary/30"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/ykay-students.png"
            alt="Students in green-and-white uniforms on the Ykay College campus in Sango Ota"
            loading="lazy"
            className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-2xl"
          />
          <p className="relative mt-3 text-xs font-semibold text-white/80">
            Sango Ota, Ogun State · “…Raising Role Models” · est. 2021
          </p>
        </div>
      </div>
    </section>
  );
}
