"use client";

import { ArrowRight, Beaker, Dumbbell, GraduationCap, Laptop, MapPin } from "lucide-react";

/**
 * Home bridge to Ykay College — split campus story: photo + copy, edge to edge.
 */
export function CollegeBridge() {
  const COLLEGE_URL =
    process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

  return (
    <section className="relative w-full overflow-hidden bg-[#062214]">
      <div className="grid w-full lg:grid-cols-2">
        <div className="relative min-h-[320px] lg:min-h-[560px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/ykay-students.png"
            alt="Ykay College students in school uniform, Sango Ota campus"
            className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062214] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#062214]" />
          <p className="absolute bottom-5 left-6 inline-flex items-center gap-2 text-xs font-semibold text-white/90 lg:left-8">
            <MapPin size={13} className="text-primary" />
            Km 38, Lagos–Abeokuta Expressway · Sango Ota
          </p>
        </div>

        <div className="relative flex flex-col justify-center px-6 py-14 md:px-12 md:py-20 lg:px-16">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <GraduationCap size={12} /> The Ykay family · Campus
          </span>
          <h2 className="font-display text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.88] tracking-[-0.02em] text-white">
            YKAY
            <span className="block text-primary">COLLEGE</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85">
            The campus school in Sango Ota — JSS1 to SS3, science laboratories,
            sports, clubs and a full IT academy on the timetable. Same family,
            same standard, on campus and on YK-Virtual.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            {[
              { icon: Beaker, label: "Science laboratories" },
              { icon: Dumbbell, label: "Sports and clubs" },
              { icon: Laptop, label: "IT academy on timetable" },
              { icon: GraduationCap, label: "JSS1 to SS3" },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/90"
              >
                <item.icon size={14} className="shrink-0 text-primary" />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-deep-green shadow-lg transition hover:scale-[1.03] hover:bg-primary-hover"
            >
              Visit Ykay College <ArrowRight size={14} />
            </a>
            <a
              href="/college"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              What is the campus school?
            </a>
          </div>
          <p className="mt-5 text-xs font-semibold text-white/55">
            Raising Role Models · est. 2021
          </p>
        </div>
      </div>
    </section>
  );
}
