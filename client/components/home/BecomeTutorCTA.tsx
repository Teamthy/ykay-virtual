import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";

// Become-a-tutor section (Batch 2) — rebuilt on the PrebuiltUI hero
// template: grid-pattern background, centered announcement pill, oversized
// headline, dual CTAs. No photo hotlinks; the grid is an inline SVG.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%23F4B400' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

export function BecomeTutorCTA() {
  return (
    <section
      className="w-full bg-no-repeat bg-cover bg-center pb-20 pt-24 md:pb-28 md:pt-32"
      style={{ backgroundImage: GRID_BG, backgroundColor: "#FFF7E4" }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center">
        {/* Announcement pill */}
        <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="font-semibold text-ink-700">
            New: tutors keep up to 90% of every lesson fee
          </span>
          <Link href="/become-tutor" className="flex items-center gap-1 font-bold text-brand-blue hover:text-brand-navy">
            <span>Read more</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Oversized headline */}
        <h2 className="mt-8 max-w-[850px] font-display text-4xl tracking-[0.02em] text-brand-navy md:text-6xl">
          Teach what you love.
          <br />
          Get paid to do it.
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-sm text-ink-600 md:text-base">
          Join NUVORA&apos;s community of vetted tutors. Set your own rates and schedule,
          teach online or in person, and get paid weekly — while we handle the
          bookings, payments and students for you.
        </p>

        {/* Dual CTAs */}
        <div className="mx-auto mt-8 flex w-full flex-wrap items-center justify-center gap-3">
          <Link
            href="/become-tutor"
            className="rounded-full bg-brand-blue px-8 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy"
          >
            Apply to teach
          </Link>
          <Link
            href="/how-it-works"
            className="flex items-center gap-2 rounded-full border border-ink-300 px-8 py-3.5 text-sm font-bold text-ink-800 transition hover:bg-ink-100"
          >
            <span>Learn how it works</span>
            <ChevronRight size={15} className="text-ink-400" />
          </Link>
        </div>
      </div>
    </section>
  );
}
