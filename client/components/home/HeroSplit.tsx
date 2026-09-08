"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, UserRound, X } from "lucide-react";

// Homepage hero — full-bleed deep-green brand band carrying one rounded
// peach card (approved reference composition, 2026-09-08): slim chrome row
// (brand mark · pill nav · contact pill · round auth buttons), letterspaced
// eyebrow, one enormous two-line display headline with round lime controls,
// and a horizontal rail of programme cards — first card lime ("active"), the
// rest white — each with two chips, an index badge, an editorial portrait and
// a white "Read More" pill.
//
// The rail is in motion: it drifts automatically (marquee pace), pauses on
// hover/focus/touch, wraps seamlessly, and stands still for users who prefer
// reduced motion. The round arrows still drive it manually.
//
// Copy discipline: every claim below is a real surface of the product. No
// invented statistics, no press logos.

const NAV = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Programs", href: "/programmes" },
  { label: "Exam Prep", href: "/exam-prep" },
];

const CARDS = [
  {
    n: "01",
    title: ["Junior", "Programs"],
    chips: ["JSS 1–3", "BECE track"],
    blurb: "Live online classes for JSS1–JSS3, built on the NERDC scheme of work.",
    img: "/home/card-jss.jpg",
    alt: "Junior secondary student in a striped shirt against a blue backdrop",
    href: "/online-classes",
    active: true,
  },
  {
    n: "02",
    title: ["Senior", "Programs"],
    chips: ["SS 1–3", "WASSCE route"],
    blurb: "SS1–SS3 cohorts with structured WASSCE and UTME preparation.",
    img: "/home/card-ss.jpg",
    alt: "Senior secondary student with braids against a lavender backdrop",
    href: "/programmes",
    active: false,
  },
  {
    n: "03",
    title: ["Exam", "Preparation"],
    chips: ["UTME", "All levels"],
    blurb: "Timed practice and coaching for UTME, WAEC and NECO sittings.",
    img: "/home/card-exam.jpg",
    alt: "Student in a pink bucket hat against a teal backdrop",
    href: "/exam-prep",
    active: false,
  },
  {
    n: "04",
    title: ["Private", "Lessons"],
    chips: ["Any age", "1-on-1"],
    blurb: "Personal tuition matched to your level, pace and schedule.",
    img: "/home/card-tuition.jpg",
    alt: "Student with a notebook against a cobalt backdrop",
    href: "/private-tuition",
    active: false,
  },
];

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article aria-hidden={ariaHidden || undefined}
      className={`relative w-[240px] shrink-0 snap-start overflow-hidden rounded-3xl p-4 md:w-[280px] md:p-5 ${
        card.active ? "bg-primary" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                card.active
                  ? "bg-deep-green text-primary"
                  : "bg-peach text-deep-green"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
            card.active
              ? "bg-deep-green text-primary"
              : "bg-peach text-deep-green"
          }`}
        >
          {card.n}
        </span>
      </div>

      <h2 className="mt-4 text-[26px] font-bold leading-[1.05] tracking-[-0.01em] text-deep-green md:text-3xl">
        {card.title[0]}
        <span className="block">{card.title[1]}</span>
      </h2>
      <p className="mt-2 min-h-[3.4em] text-[11px] leading-relaxed text-[#3f5249]">
        {card.blurb}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.img}
          alt={card.alt}
          loading="eager"
          className="aspect-[4/5] w-full object-cover"
        />
        <Link
          href={card.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-bold text-deep-green shadow transition hover:bg-deep-green hover:text-primary"
        >
          Read More <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  );
}

export function HeroSplit() {
  const railRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Gentle marquee drift: duplicate the card set, advance scrollLeft, wrap at
  // the halfway point so the loop is seamless. Paused while the user is
  // interacting and disabled entirely for prefers-reduced-motion.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    // One full set = distance to the first duplicate card; wrapping by
    // exactly that offset makes the loop seamless.
    const half = () => {
      const dup = el.children[CARDS.length] as HTMLElement | undefined;
      const first = el.children[0] as HTMLElement | undefined;
      return dup && first ? dup.offsetLeft - first.offsetLeft : el.scrollWidth / 2;
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!hoverRef.current && !el.matches(":hover") && !el.matches(":focus-within")) {
        const wrap = half();
        let next = el.scrollLeft + dt * 0.03; // ~30px/s drift
        if (next >= wrap) next -= wrap;
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const pause = () => {
      hoverRef.current = true;
    };
    const resume = () => {
      hoverRef.current = false;
    };
    el.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
  };

  return (
    <section className="backdrop-brand-dark w-full bg-deep-green px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto max-w-[1240px] rounded-[28px] bg-peach px-5 pb-6 pt-5 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.55)] md:px-10 md:pb-10 md:pt-7">
        {/* ── chrome row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label="YK-Virtual home"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-deep-green"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                <path
                  d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 rounded-full bg-deep-green/10 p-1 md:flex"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-deep-green transition hover:bg-deep-green hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="hidden items-center gap-1.5 rounded-full bg-deep-green/10 px-4 py-2 text-[11px] font-semibold text-deep-green transition hover:bg-deep-green hover:text-primary sm:inline-flex"
            >
              Contact Us <ArrowRight size={12} />
            </Link>
            <Link
              href="/login"
              aria-label="Log in"
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green/10 text-deep-green transition hover:bg-deep-green hover:text-primary"
            >
              <UserRound size={15} />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green/10 text-deep-green transition hover:bg-deep-green hover:text-primary md:hidden"
            >
              {menuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            aria-label="Mobile"
            className="mt-3 grid gap-1 rounded-2xl bg-deep-green/10 p-3 md:hidden"
          >
            {[...NAV, { label: "Contact Us", href: "/contact" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-deep-green hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* ── eyebrow + headline + controls ──────────────────────────── */}
        <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.28em] text-[#3f5249] md:mt-14">
          Elevate your learning
        </p>
        <div className="mt-3 flex items-end justify-between gap-6">
          <h1 className="max-w-[16ch] text-[clamp(2.4rem,6.2vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-deep-green">
            Comprehensive Learning for Every Student
          </h1>
          <div className="hidden shrink-0 items-center gap-2 pb-2 md:flex">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              aria-label="Scroll programmes left"
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
            >
              <ArrowRight size={14} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              aria-label="Scroll programmes right"
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── programme rail (in motion) ─────────────────────────────── */}
        <div
          ref={railRef}
          className="mt-8 flex gap-4 overflow-x-auto pb-2 md:mt-10 md:gap-5"
        >
          {CARDS.map((card) => (
            <Card key={card.n} card={card} />
          ))}
          {/* duplicate set keeps the marquee seamless; hidden from AT */}
          {CARDS.map((card) => (
            <Card key={`dup-${card.n}`} card={card} ariaHidden />
          ))}
        </div>
      </div>
    </section>
  );
}
