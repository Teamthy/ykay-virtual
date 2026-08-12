import Image from "next/image";
import Link from "next/link";
import { Star, Users, BookOpen } from "lucide-react";

// "Meet Some Of Our Tutors" — Tuteria v2 real tutor cards (Oluwatobi, Olanike)
// with ratings, student/lesson counts and verified review quote.

const TUTORS = [
  {
    name: "Oluwatobi",
    rating: "4.6",
    reviews: "20 Reviews",
    headline: "Build student's confidence in Mathematics and Sciences",
    students: "37",
    lessons: "680",
    exams: "Common Entrance, Checkpoint, WAEC, NECO, UTME, NABTEB, IJMB, IGCSE, and SAT",
    quote:
      "I highly recommend Oluwatobi to other clients. He has not only demonstrated exceptional teaching skills but has also successfully built a strong rapport with my son. Under Oluwatobi's guidance, my son has not only improved academically but has also gained confidence in handling his tasks independently.",
    quotedBy: "Mr. Victor",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  },
  {
    name: "Olanike",
    rating: "5",
    reviews: "8 Reviews",
    headline: "Expert Mathematics Teacher",
    students: "21",
    lessons: "410",
    exams: "Primary Maths, Checkpoint, WAEC, NECO, UTME and IGCSE",
    quote:
      "Olanike is an exceptional teacher. She explains concepts so clearly that my daughter looks forward to every lesson. Her grades have improved remarkably in just one term.",
    quotedBy: "Mrs. Adebayo",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80",
  },
];

export function TutorsShowcase() {
  return (
    <section className="border-t border-ink-100 bg-surface-muted py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
            Meet Some Of Our Tutors
          </h2>
          <p className="mt-3 text-ink-600">
            Enjoy one-on-one instruction from Nigeria&apos;s biggest network of independent experts.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {TUTORS.map((t) => (
            <div key={t.name} className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
              <div className="flex flex-col sm:flex-row">
                <div className="relative h-44 w-full sm:h-auto sm:w-44 shrink-0">
                  <Image
                    src={t.img}
                    alt={t.name}
                    width={352}
                    height={440}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-brand-navy shadow-soft">
                    ★ {t.rating}
                  </span>
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl tracking-[0.02em] text-brand-navy">{t.name}</h3>
                    <span className="text-xs font-semibold text-ink-400">{t.reviews}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-700">{t.headline}</p>
                  <div className="mt-3 flex items-center gap-5 text-xs font-semibold text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-brand-blue" /> {t.students} Students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} className="text-brand-blue" /> {t.lessons} Lessons
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-ink-500">{t.exams}</p>
                </div>
              </div>
              <div className="border-t border-ink-100 bg-surface-muted px-6 py-4">
                <div className="flex items-start gap-1 text-brand-gold" aria-label="5 star rating">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <p className="mt-2 text-sm italic leading-relaxed text-ink-600">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-2 text-xs font-bold text-ink-800">— {t.quotedBy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/tutors"
            className="inline-block rounded-xl bg-brand-navy px-9 py-4 text-sm font-bold text-white transition-colors hover:bg-brand-blue"
          >
            Browse all tutors
          </Link>
        </div>
      </div>
    </section>
  );
}
