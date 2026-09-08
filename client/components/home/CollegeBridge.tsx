"use client";

import { ArrowRight, GraduationCap } from "lucide-react";

/**
 * Home bridge to Ykay College — the campus school of the Ykay family.
 *
 * Full-bleed deep-green brand band, edge to edge. Copy states only what the
 * onboarding form confirms: an inclusive day secondary school, JSS1–SS3,
 * BECE / WASSCE / IGCSE routes, "…Raising Role Models", established 2021.
 * No invented address, no unconfirmed facilities.
 */
export function CollegeBridge() {
  const COLLEGE_URL =
    process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

  return (
    <section className="backdrop-brand-dark relative w-full overflow-hidden bg-deep-green py-16 md:py-24">
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 md:grid-cols-2 md:px-10">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <GraduationCap size={12} /> The Ykay family · Campus
          </span>
          <h2 className="font-display text-[clamp(2.25rem,6vw,5rem)] leading-[0.9] tracking-[-0.015em] text-white">
            YKAY
            <span className="block text-primary">COLLEGE</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
            Our inclusive day secondary school — JSS1 to SS3 on BECE, WASSCE
            and IGCSE routes, raising role models since 2021. College students
            learn on campus and practise on YK&#8209;Virtual with one login.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/20"
            >
              What is it?
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-primary/25"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/campus.jpg"
            alt="Students in green-and-white uniforms on the Ykay College campus"
            loading="lazy"
            className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-2xl"
          />
          <p className="relative mt-3 text-xs font-semibold text-white/70">
            &ldquo;&hellip;Raising Role Models&rdquo; · est. September 2021
          </p>
        </div>
      </div>
    </section>
  );
}
