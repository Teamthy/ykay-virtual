import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

// Home hero — reference-grade (Tuteria-style): headline + social proof +
// video invite + right-side imagery with floating rating card.

const HERO_IMG =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80";

export function HeroReference() {
  return (
    <section className="bg-white border-b border-ink-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14 md:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface-muted px-4 py-1.5 text-xs font-semibold text-ink-600">
            <span className="h-2 w-2 rounded-full bg-brand-green" aria-hidden="true" />
            Trusted by 30,000+ families
          </p>
          <h1 className="mt-5 text-4xl md:text-[52px] font-extrabold leading-[1.08] tracking-tight text-brand-navy">
            Improve Your Child&apos;s Learning And{" "}
            <span className="text-brand-blue">Academic Confidence</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600 leading-relaxed">
            Join over 30,000 families using NUVORA — the largest community of
            vetted, competency-tested tutors across Nigeria.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/tutors">
              <Button size="lg">Get the best tutors</Button>
            </Link>
            <a
              href="https://www.youtube.com/results?search_query=online+tutoring+nigeria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-blue-light text-brand-blue">
                <Play size={16} className="ml-0.5" fill="currentColor" />
              </span>
              Watch on YouTube
            </a>
          </div>
        </div>

        <div className="relative">
          <img
            src={HERO_IMG}
            alt="Learner studying with a NUVORA tutor"
            className="w-full aspect-[4/3] object-cover rounded-3xl shadow-card"
          />
          <span className="absolute -top-3 right-6 rounded-full bg-brand-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy shadow-soft">
            100% vetted tutors
          </span>
          <div className="absolute -bottom-5 left-6 rounded-2xl border border-ink-100 bg-white px-5 py-3.5 shadow-lift">
            <div className="flex items-center gap-1 text-brand-gold" aria-label="Rated 4.87 out of 5">
              {"★★★★★".split("").map((s, i) => (
                <span key={i} className="text-sm">{s}</span>
              ))}
            </div>
            <p className="mt-0.5 text-xs font-semibold text-ink-600">4.87 average tutor rating · 28 reviews</p>
          </div>
        </div>
      </div>
    </section>
  );
}
