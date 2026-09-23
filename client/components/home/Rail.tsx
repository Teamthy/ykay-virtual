"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CARDS = [
  {
    n: "01",
    title: ["Junior", "Programs"],
    chips: ["JSS 1–3", "BECE track"],
    blurb: "Live online classes for JSS1–JSS3, built on the NERDC scheme of work.",
    img: "/home/card-jss.jpg",
    href: "/online-classes",
  },
  {
    n: "02",
    title: ["Senior", "Programs"],
    chips: ["SS 1–3", "WASSCE route"],
    blurb: "SS1–SS3 cohorts with structured WASSCE and UTME preparation.",
    img: "/home/card-ss.jpg",
    href: "/programmes",
  },
  {
    n: "03",
    title: ["Exam", "Preparation"],
    chips: ["UTME", "WAEC · NECO"],
    blurb: "Timed practice and coaching for UTME, WAEC and NECO sittings.",
    img: "/home/card-exam.jpg",
    href: "/exam-prep",
  },
  {
    n: "04",
    title: ["Private", "Lessons"],
    chips: ["Any age", "1-on-1"],
    blurb: "Personal tuition matched to your level, pace and schedule.",
    img: "/home/card-tuition.jpg",
    href: "/private-tuition",
  },
  {
    n: "05",
    title: ["CBT", "Practice"],
    chips: ["Timed", "Past papers"],
    blurb: "Exam-hall simulations with instant scoring and explanations.",
    img: "/home/card-cbt.jpg",
    href: "/login?next=/lms/practice",
  },
  {
    n: "06",
    title: ["Home", "Tutoring"],
    chips: ["At home", "Vetted tutors"],
    blurb: "Vetted tutors matched to your child, at home or online.",
    img: "/home/card-tutoring.jpg",
    href: "/hometutors",
  },
  {
    n: "07",
    title: ["UTME", "2026"],
    chips: ["JAMB track", "Score boost"],
    blurb: "A structured 2026 UTME run: syllabus, mocks and weekly reviews.",
    img: "/home/card-utme.jpg",
    href: "/utme-2026",
  },
  {
    n: "08",
    title: ["Digital", "Skills"],
    chips: ["IT academy", "Certificates"],
    blurb: "Practical digital skills — coding, Office, and online literacy.",
    img: "/hero/digital.jpg",
    href: "/digital-skills",
  },
  {
    n: "09",
    title: ["Online", "Classes"],
    chips: ["Live", "Recorded"],
    blurb: "Live cohorts with recordings, assignments and progress reports.",
    img: "/hero/cohorts.jpg",
    href: "/online-classes",
  },
  {
    n: "10",
    title: ["British", "Curriculum"],
    chips: ["IGCSE", "A-Level"],
    blurb: "Year 7–13 British pathway with IGCSE and A-Level coaching.",
    img: "/hero/british.jpg",
    href: "/curricula/british",
  },
  {
    n: "11",
    title: ["Nigerian", "Curriculum"],
    chips: ["NERDC", "JSS · SSS"],
    blurb: "NERDC-aligned JSS and SSS with BECE and WASSCE routes.",
    img: "/hero/nigerian.jpg",
    href: "/curricula/nigerian",
  },
];

function scrollRailBy(el: HTMLDivElement | null, dir: 1 | -1) {
  if (!el) return;
  el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
}

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article
      role={ariaHidden ? undefined : "group"}
      aria-label={ariaHidden ? undefined : `${card.title[0]} ${card.title[1]}`}
      className="group relative w-[min(78vw,260px)] overflow-hidden rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_4px_24px_rgba(15,42,26,0.06)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#D6FF57] hover:shadow-[0_12px_40px_rgba(15,42,26,0.15)] md:w-[300px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip) => (
            <span key={chip} className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A] group-hover:bg-[#0F2A1A] group-hover:text-white transition">
              {chip}
            </span>
          ))}
        </div>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/5 text-[10px] font-bold text-[#0F2A1A] group-hover:bg-[#0F2A1A] group-hover:text-[#D6FF57] transition">
          {card.n}
        </span>
      </div>

      <h3 className="mt-4 font-display text-[26px] font-normal leading-[0.9] tracking-[-0.02em] text-[#0F2A1A] md:text-[28px]">
        {card.title[0]} <span className="block">{card.title[1]}</span>
      </h3>
      <p className="mt-2 min-h-[3.4em] text-[12px] leading-relaxed text-[#0F2A1A]/65 group-hover:text-[#0F2A1A]/70">
        {card.blurb}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-[14px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.img} alt="" aria-hidden="true" loading="lazy" className="aspect-[4/3.2] w-full object-cover object-top transition duration-700 group-hover:scale-[1.05]" />
        {ariaHidden ? (
          <span aria-hidden="true" className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11px] font-bold text-[#0F2A1A] shadow">
            Read more <ArrowRight size={12} />
          </span>
        ) : (
          <Link href={card.href} className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11px] font-bold text-[#0F2A1A] shadow transition group-hover:bg-[#0F2A1A] group-hover:text-white">
            Read more <ArrowRight size={12} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function Rail() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const pause = () => el.classList.add("rail-marquee-paused");
    const resume = () => el.classList.remove("rail-marquee-paused");
    el.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    return () => {
      el.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  return (
    <div id="programmes-rail" aria-labelledby="programmes-rail-title" className="relative isolate w-full overflow-hidden bg-[#F9F6ED]">
      <div className="relative z-10 mx-auto w-full max-w-[1920px] px-4 pb-12 pt-10 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 md:pb-16 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="programmes-rail-title" className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-[0.9] tracking-[-0.02em] text-[#0F2A1A] uppercase">
              Find your track
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#0F2A1A]/65">
              Live cohorts, private tuition, exam prep and digital skills — choose the format that fits your learner&apos;s pace and goals.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => scrollRailBy(trackRef.current, -1)} aria-label="Scroll left" className="grid size-9 place-items-center rounded-full border border-black/10 bg-white text-[#0F2A1A] hover:bg-[#0F2A1A] hover:text-white transition">
              <ArrowRight size={14} className="rotate-180" />
            </button>
            <button type="button" onClick={() => scrollRailBy(trackRef.current, 1)} aria-label="Scroll right" className="grid size-9 place-items-center rounded-full bg-[#0F2A1A] text-white hover:bg-black transition">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="home-screen-track scrollbar-none mt-8 overflow-x-auto pb-4">
          <ul className="flex w-max animate-rail-marquee list-none gap-5 motion-reduce:animate-none" style={{ ["--rail-shift" as string]: "calc(-50% - 0.625rem)" }}>
            {CARDS.map((card) => (
              <li key={card.n} className="shrink-0">
                <Card card={card} />
              </li>
            ))}
            {CARDS.map((card) => (
              <li key={`dup-${card.n}`} aria-hidden="true" className="shrink-0">
                <Card card={card} ariaHidden />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
