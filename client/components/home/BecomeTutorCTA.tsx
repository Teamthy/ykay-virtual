import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ArrowRight } from "lucide-react";

// Become-a-tutor section — photo background (local, dark-green overlay) so
// the white copy sits on real imagery instead of a grid pattern. Premium,
// high-contrast, brand palette.

export function BecomeTutorCTA() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src="/hero/nuvora-plus.jpg"
        alt=""
        fill
        priority={false}
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-brand-navy/85" aria-hidden />

      <div className="relative container-x py-20 text-center md:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            New: tutors keep up to 90% of every lesson fee
            <Link
              href="/become-tutor"
              className="ml-1 inline-flex items-center gap-1 font-bold text-brand-gold transition hover:text-white"
            >
              <span>Read more</span>
              <ArrowRight size={14} />
            </Link>
          </span>

          <h2 className="mt-8 font-display text-4xl tracking-[0.02em] text-white md:text-6xl">
            Teach what you love.
            <br />
            Get paid to do it.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-white/80 md:text-base">
            Join NUVORA&apos;s community of vetted tutors. Set your own rates and schedule,
            teach online or in person, and get paid weekly — while we handle the
            bookings, payments and students for you.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/become-tutor"
              className="rounded-full bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
            >
              Apply to teach
            </Link>
            <Link
              href="/how-it-works"
              className="flex items-center gap-2 rounded-full border border-white/40 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <span>Learn how it works</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
