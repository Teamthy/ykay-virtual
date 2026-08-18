"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, BadgeCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// Homepage hero - STACKED layout: the brand story + CTA sit on TOP, and the
// image carousel runs full-width BELOW it. The copy is static (one clear
// message); only the images rotate. Real photography, never AI-looking.

const SLIDES = [
  { label: "Home Tutoring", href: "/hometutors", img: "/hero/home-tutoring.jpg", alt: "Tutor helping a young student at home" },
  { label: "International", href: "/nuvora-plus", img: "/hero/international.jpg", alt: "Graduates celebrating international success" },
  { label: "UTME 2026", href: "/utme-2026", img: "/hero/utme.jpg", alt: "Student writing answers during exam preparation" },
  { label: "Test Prep", href: "/test-prep", img: "/hero/test-prep.jpg", alt: "Student taking notes while preparing for tests" },
  { label: "NUVORA Plus", href: "/nuvora-plus", img: "/hero/nuvora-plus.jpg", alt: "Tutor guiding a young learner one-on-one" },
];

const TRUST = [
  { icon: ShieldCheck, text: "Escrow-protected payments" },
  { icon: BadgeCheck, text: "ID-verified tutors" },
  { icon: FileText, text: "Progress reports for parents" },
];

const DURATION = 6000;

export function HeroSplit() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % SLIDES.length), DURATION);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive((active - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setActive((active + 1) % SLIDES.length);

  return (
    <section className="py-10 md:py-14">
      {/* ── Top: brand story (static) ── */}
      <div className="container-x text-center">
        <h1 className="mx-auto max-w-4xl font-display text-4xl leading-[1.05] tracking-[0.01em] text-brand-navy md:text-5xl lg:text-6xl">
          Better, brighter futures for your kids.
        </h1>

        <p className="mx-auto mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-green">
          British &amp; Nigerian curricula · Vetted tutors
        </p>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-600 md:text-lg">
          Personalised tutoring that guides your child toward exam success, better grades and
          real confidence - from identity-verified, background-checked tutors.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/tutors"
            className="group inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
          >
            Find a tutor
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-7 py-3.5 text-sm font-bold text-ink-800 transition-colors hover:border-brand-navy hover:bg-brand-navy hover:text-white"
          >
            How it works
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-ink-100 pt-6">
          {TRUST.map((t) => (
            <li key={t.text} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <t.icon size={16} className="text-brand-green" />
              {t.text}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Below: full-width image carousel ── */}
      <div className="container-x mt-10">
        <div className="relative">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-ink-100 shadow-card sm:aspect-[21/9]">
            {SLIDES.map((s, i) => (
              <div
                key={s.img + i}
                className={cn(
                  "absolute inset-0 transition-opacity duration-700",
                  i === active ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={i !== active}
              >
                <Image src={s.img} alt={s.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-6">
                  <Link href={s.href} className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-ink-900 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5">
                    {s.label}
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}

            {/* Arrows */}
            <button type="button" onClick={prev} aria-label="Previous image" className="absolute inset-y-0 left-0 w-11 items-center justify-center text-white/70 transition-colors hover:bg-black/10 hover:text-white md:inline-flex">
              <ChevronLeft size={24} />
            </button>
            <button type="button" onClick={next} aria-label="Next image" className="absolute inset-y-0 right-0 w-11 items-center justify-center text-white/70 transition-colors hover:bg-black/10 hover:text-white md:inline-flex">
              <ChevronRight size={24} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={cn("h-1.5 rounded-full transition-all", i === active ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
