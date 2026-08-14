"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Homepage hero — full-bleed image slider (Preline-style): five case-study
// slides matching the reference screenshots (Home Tutoring · International ·
// UTME 2026 · Test Prep · NUVORA Plus), bottom-left caption + CTA, arrows,
// dots, auto-advance. Real photography, never AI-looking.

const SLIDES = [
  {
    tag: "Trusted by 30,000+ families",
    title: "Better, Brighter Future For Your Kids.",
    desc: "Get personalized home tutoring designed to guide your children toward exam success, boost their confidence, and get better school grades.",
    cta: "Get Started",
    href: "/hometutors",
    img: "/hero/home-tutoring.jpg",
    alt: "Tutor helping a young student at home",
  },
  {
    tag: "Trusted by Families Across 4 Continents",
    title: "Foreign-Standard Tutoring without the Foreign Price Tag",
    desc: "Give your child the quality of education families abroad pay thousands for — delivered by top Nigerian tutors at up to 70% less.",
    cta: "Book a Tutor Today",
    href: "/nuvora-plus",
    img: "/hero/international.jpg",
    alt: "Graduates celebrating international success",
  },
  {
    tag: "Highest Score: 345 in 2025 Prep Cohort",
    title: "UTME 2026 Prep — Your Child's Best Chance at Admission Success",
    desc: "Weekly mock CBT, 200+ practice tests, remedial support and a ₦20M scholarship pool. Be UTME-ready and set for admission success.",
    cta: "Enroll for UTME 2026 Prep",
    href: "/utme-2026",
    img: "/hero/utme.jpg",
    alt: "Student writing answers during exam preparation",
  },
  {
    tag: "95% Exam Success Rate",
    title: "Study, Work, and Thrive Abroad with Perfect Test Scores",
    desc: "Prepare for IELTS, GRE, GMAT, TEF and more with proven strategies and top tutors — 95% exam success rate.",
    cta: "Start your Journey today",
    href: "/test-prep",
    img: "/hero/test-prep.jpg",
    alt: "Student taking notes while preparing for tests",
  },
  {
    tag: "Top 5% of Tutors Nationwide",
    title: "Upgrade Your Child's Learning with NUVORA Plus",
    desc: "Give your child the ultimate learning advantage with NUVORA Plus — our premium tutoring service designed for families who want the best.",
    cta: "Unlock Premium Tutoring",
    href: "/nuvora-plus",
    img: "/hero/nuvora-plus.jpg",
    alt: "Tutor guiding a young learner one-on-one",
  },
];

const DURATION = 10000;

export function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % SLIDES.length), DURATION);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive((active - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setActive((active + 1) % SLIDES.length);

  return (
    <section className="px-0 sm:px-0 py-0">
      <div className="relative">
        <div className="relative h-[520px] w-full overflow-hidden rounded-none bg-ink-100 md:h-[560px] lg:h-[600px]">
          {SLIDES.map((s, i) => (
            <div
              key={s.href + i}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === active ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-hidden={i !== active}
            >
              <Image
                src={s.img}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
              {/* legibility overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="mx-auto max-w-[1400px] px-6 pb-10 md:px-10 md:pb-14">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
                      {s.tag}
                    </span>
                    <h1 className="mt-4 font-display text-3xl leading-tight tracking-[0.02em] text-white md:text-5xl">
                      {s.title}
                    </h1>
                    <p className="mt-3 hidden max-w-xl text-base leading-relaxed text-white/85 md:block">
                      {s.desc}
                    </p>
                    <div className="mt-6">
                      <Link
                        href={s.href}
                        className="group inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
                      >
                        {s.cta}
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Arrows */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute inset-y-0 left-0 hidden w-14 items-center justify-center text-white/70 transition-colors hover:bg-black/10 hover:text-white md:inline-flex"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute inset-y-0 right-0 hidden w-14 items-center justify-center text-white/70 transition-colors hover:bg-black/10 hover:text-white md:inline-flex"
          >
            <ChevronRight size={26} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-8 bg-brand-gold" : "w-3 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
