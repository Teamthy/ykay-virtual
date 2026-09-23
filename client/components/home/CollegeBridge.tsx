"use client";
import { ArrowRight, MapPin, Beaker, Dumbbell, Laptop, GraduationCap } from "lucide-react";

export function CollegeBridge() {
  const COLLEGE_URL = process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";
  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* image card */}
          <div className="relative overflow-hidden rounded-[24px] aspect-[4/3] lg:aspect-[4/3.2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/ykay-students.png" alt="Ykay College students" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A1A] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-[#0F2A1A] shadow">
                <MapPin size={12} /> Km 38, Lagos–Abeokuta Expressway · Sango Ota
              </span>
            </div>
          </div>

          {/* copy */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              <GraduationCap size={12} className="text-[#D6FF57]" /> The Ykay family · Campus
            </div>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[0.85] tracking-[-0.02em] uppercase">
              YKAY <span className="text-[#D6FF57]">COLLEGE</span>
            </h2>
            <p className="mt-4 text-[14px] leading-[1.6] text-white/70 max-w-[48ch]">
              The campus school in Sango Ota — JSS1 to SS3, science laboratories, sports, clubs and a full IT academy on the timetable. Same family, same standard, on campus and on YK-Virtual.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-[420px]">
              {[
                { icon: Beaker, label: "Science labs" },
                { icon: Dumbbell, label: "Sports & clubs" },
                { icon: Laptop, label: "IT academy" },
                { icon: GraduationCap, label: "JSS1 to SS3" },
              ].map((it) => (
                <div key={it.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold">
                  <it.icon size={14} className="text-[#D6FF57]" /> {it.label}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={COLLEGE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#c8f030]">
                Visit Ykay College <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white"><ArrowRight size={12} /></span>
              </a>
              <a href="/college" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
                About campus
              </a>
            </div>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-wide text-white/65">Raising Role Models · est. 2021</p>
          </div>
        </div>
      </div>
    </section>
  );
}
