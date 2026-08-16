import Image from "next/image";
import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";

// "Meet Some Of Our Tutors" — Preline team template: avatar + name + role
// rows with rating + verified chip, plus a "We are hiring!"-style card that
// links to the full tutor directory.

const TUTORS = [
  {
    name: "Chinasa",
    role: "Maths & English · Grades 1–6",
    rating: "4.87",
    reviews: "28 reviews",
    img: "/tutors/chinasa.jpg",
    // A-22: no hardcoded profile slugs — production tutor slugs are
    // generated (demo-tutor-N); link to the live directory instead.
    href: "/tutors",
  },
  {
    name: "Oluwatobi",
    role: "Mathematics & Sciences",
    rating: "4.6",
    reviews: "20 reviews",
    img: "/tutors/oluwatobi.jpg",
    href: "/tutors",
  },
  {
    name: "Olanike",
    role: "Expert Mathematics Teacher",
    rating: "5",
    reviews: "8 reviews",
    img: "/tutors/olanike.jpg",
    href: "/tutors",
  },
  {
    name: "Adewale",
    role: "GMAT & Test Prep Tutor",
    rating: "4.8",
    reviews: "15 reviews",
    img: "/tutors/adewale.jpg",
    href: "/tutors",
  },
  {
    name: "Judith",
    role: "German Language Tutor",
    rating: "4.9",
    reviews: "11 reviews",
    img: "/tutors/judith.jpg",
    href: "/tutors",
  },
  {
    name: "Demilola",
    role: "Fashion Design Tutor",
    rating: "4.7",
    reviews: "9 reviews",
    img: "/tutors/demilola.jpg",
    href: "/tutors",
  },
];

export function TutorsShowcase() {
  return (
    <section className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-14 md:px-10 lg:py-14">
        {/* Title */}
        <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
          <h2 className="font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">Meet some of our tutors</h2>
          <p className="mt-1 text-ink-600">Enjoy one-on-one instruction from Nigeria&apos;s biggest network of independent experts.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-3">
          {TUTORS.map((t) => (
            <Link key={t.name} href={t.href} className="group flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Image
                src={t.img}
                alt={t.name}
                width={80}
                height={80}
                className="size-20 rounded-lg object-cover"
              />
              <div className="grow">
                <div>
                  <h3 className="flex items-center gap-1.5 font-medium text-ink-900 transition-colors group-hover:text-brand-gold-dark">
                    {t.name}
                    <BadgeCheck size={15} className="text-brand-green" aria-label="Verified" />
                  </h3>
                  <p className="mt-1 text-xs uppercase text-ink-500">{t.role}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-ink-800">
                    <Star size={13} className="text-brand-gold" fill="currentColor" strokeWidth={0} />
                    {t.rating}
                  </span>
                  <span className="text-xs text-ink-500">{t.reviews}</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Browse-all card (team "We are hiring!" treatment) */}
          <Link
            href="/tutors"
            className="flex flex-col items-start justify-center gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="grid size-20 place-items-center rounded-lg border border-dashed border-ink-300 bg-surface-muted text-3xl">
              →
            </span>
            <div className="grow">
              <h3 className="font-medium text-ink-900">Browse all tutors</h3>
              <span className="text-sm font-medium text-brand-gold-dark decoration-2 hover:underline">
                Check out / Tutors
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
