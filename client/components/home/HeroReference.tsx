import Image from "next/image";
import Link from "next/link";
import { Play, ArrowRight, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Home hero v2 — senior-designer composition: restrained navy surface, hairline
// grid texture, one focal image (optimized via next/image: priority, sizes,
// blur placeholder), floating glass stat chip with gentle float motion, and
// staged entrance animation. No AI-look gradients-on-gradients; depth via
// layering + soft shadows.

const BLUR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI0OCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMEExRjQ0Ii8+PGNpcmNsZSBjeD0iNDgiIGN5PSIxMiIgcj0iMTgiIGZpbGw9IiMxRTVFRkYiIG9wYWNpdHk9IjAuMzUiLz48L3N2Zz4=";

export function HeroReference() {
  return (
    <section className="relative overflow-hidden border-b border-ink-100 bg-white">
      {/* subtle topo grid, very low opacity */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(10,31,68,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,31,68,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-brand-blue-light blur-3xl"
        aria-hidden="true"
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
        <div>
          <p className="animate-hero-in inline-flex items-center gap-2.5 rounded-full border border-ink-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-ink-600 shadow-soft backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
            </span>
            Trusted by 30,000+ families across Nigeria
          </p>

          <h1 className="animate-hero-in mt-6 text-[2.6rem] leading-[1.06] font-extrabold tracking-[-0.02em] text-brand-navy md:text-6xl">
            Improve your child&apos;s learning and{" "}
            <span className="relative">
              academic confidence
              <svg
                className="absolute -bottom-2 left-0 w-full text-brand-gold"
                viewBox="0 0 220 12"
                fill="none"
                aria-hidden="true"
              >
                <path d="M3 9c60-6 154-6 214-3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="animate-hero-in-late mt-7 max-w-xl text-lg leading-relaxed text-ink-600">
            Join over 30,000 families using NUVORA — the largest community of
            vetted, competency-tested tutors across Nigeria&apos;s British and
            Nigerian curricula.
          </p>

          <div className="animate-hero-in-late mt-9 flex flex-wrap items-center gap-4">
            <Link href="/tutors">
              <Button size="lg" className="group">
                Get the best tutors
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a
              href="https://www.youtube.com/results?search_query=online+tutoring+nigeria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-blue shadow-card ring-1 ring-ink-100 transition-transform hover:scale-105">
                <Play size={15} className="ml-0.5" fill="currentColor" />
              </span>
              Watch how it works
            </a>
          </div>

          <div className="animate-hero-in-late mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-ink-500">
              <ShieldCheck size={15} className="text-brand-green" />
              Escrow-protected payments
            </span>
            <span className="flex items-center gap-2 text-ink-500">
              <Star size={15} className="text-brand-gold" fill="currentColor" />
              4.87 average tutor rating
            </span>
            <span className="flex items-center gap-2 text-ink-500">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-blue" />
              100% vetted &amp; verified tutors
            </span>
          </div>
        </div>

        {/* Image column */}
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-card ring-1 ring-ink-100">
            <Image
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80"
              alt="Student learning online with a NUVORA tutor"
              width={1040}
              height={780}
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
              className="h-auto w-full object-cover"
              placeholder="blur"
              blurDataURL={BLUR}
            />
            {/* soft bottom fade for card legibility */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-navy/25 to-transparent" />
          </div>

          {/* floating rating card */}
          <div className="animate-float absolute -left-4 bottom-8 hidden rounded-2xl border border-ink-100 bg-white/95 px-5 py-4 shadow-lift backdrop-blur sm:block">
            <div className="flex items-center gap-1 text-brand-gold" aria-label="Rated 4.87 out of 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="mt-1.5 text-xs font-semibold text-ink-600">4.87 average tutor rating</p>
            <p className="text-[10px] text-ink-400">28 verified reviews</p>
          </div>

          {/* verified chip */}
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
