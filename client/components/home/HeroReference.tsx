import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// Home hero — Tuteria v2 style (pixel-faithful): white surface, navy Anton
// display headline, pill search chip, Get Started + Learn how it works CTAs,
// image right with floating chips.

const BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI0OCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMTk0RjgyIi8+PGNpcmNsZSBjeD0iNDgiIGN5PSIxMiIgcj0iMTgiIGZpbGw9IiMwNTZGRDIiIG9wYWNpdHk9IjAuMzUiLz48L3N2Zz4=";

export function HeroReference() {
  return (
    <section className="relative overflow-hidden border-b border-ink-100 bg-white">
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
        <div>
          <h1 className="animate-hero-in mt-6 font-display text-[2.4rem] leading-[1.05] tracking-[0.02em] text-brand-navy md:text-[3.6rem]">
            Better, Brighter Future For Your Kids.
          </h1>

          <p className="animate-hero-in-late mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            Get personalized home tutoring that is designed to guide your children toward exam
            success, boost their confidence, and get better school grades.
          </p>

          <div className="animate-hero-in-late mt-8 flex flex-wrap items-center gap-4">
            <Link href="/tutors">
              <Button size="lg" className="group rounded-full bg-brand-gold px-9 text-ink-900 hover:bg-brand-gold-hover">
                Get Started
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a
              href="https://www.youtube.com/results?search_query=online+tutoring+nigeria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-brand-navy transition-colors hover:bg-brand-blue-light"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-navy shadow-card ring-1 ring-ink-100 transition-transform hover:scale-105">
                <Play size={15} className="ml-0.5" fill="currentColor" />
              </span>
              Learn how it works
            </a>
          </div>

          <div className="animate-hero-in-late mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-ink-500">
              <ShieldCheck size={15} className="text-brand-green" />
              Top 1% of vetted tutors
            </span>
            <span className="flex items-center gap-2 text-ink-500">
              <Star size={15} className="text-brand-gold" fill="currentColor" />
              4.87 average tutor rating
            </span>
            <span className="flex items-center gap-2 text-ink-500">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-blue" />
              Home or online lessons
            </span>
          </div>
        </div>

        {/* Image column */}
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-card ring-1 ring-ink-100">
            <Image
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
              alt="Student learning with a NUVORA tutor"
              width={1040}
              height={780}
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
              className="h-auto w-full object-cover"
              placeholder="blur"
              blurDataURL={BLUR}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-navy/25 to-transparent" />
          </div>

          <div className="animate-float absolute -left-4 bottom-8 hidden rounded-2xl border border-ink-100 bg-white/95 px-5 py-4 shadow-lift backdrop-blur sm:block">
            <div className="flex items-center gap-1 text-brand-gold" aria-label="Rated 4.87 out of 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="mt-1.5 text-xs font-semibold text-ink-600">4.87 average tutor rating</p>
            <p className="text-[10px] text-ink-400">28 verified reviews</p>
          </div>

          <div className="animate-hero-in-late absolute -right-3 top-6 flex items-center gap-2 rounded-full border border-ink-100 bg-white px-4 py-2 text-xs font-bold text-brand-navy shadow-soft">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-green-50 text-brand-green">
              <ShieldCheck size={12} />
            </span>
            Vetted &amp; verified
          </div>
        </div>
      </div>
    </section>
  );
}
