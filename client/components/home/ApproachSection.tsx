import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

// "We deliver the best results, period." — Preline approach template: image
// left, numbered timeline (NUVORA Insights™ → Progress Reports) right with a
// connector line, gold CTA.

const STEPS = [
  {
    title: "NUVORA Insights™ Assessment",
    desc: "Comprehensive evaluation of your child's current academic level, learning style and knowledge gaps to build a strong foundation.",
  },
  {
    title: "Adaptive Learning Plans",
    desc: "We prepare a personalized learning path adapted to empower your child to step into each classroom session with confidence and enthusiasm.",
  },
  {
    title: "Child-Centered Learning",
    desc: "Rather than molding children to fit a standardized mold, we mold education to fit each child — blending innate curiosity with structured knowledge.",
  },
  {
    title: "Periodic Evaluation",
    desc: "We monitor your child's progress every step of the way to drive continuous improvement and informed decision-making.",
  },
  {
    title: "Progress Reports & Reviews",
    desc: "You receive progress reports on your child's growth with highlights on strong and weak areas plus actionable recommendations.",
  },
];

export function ApproachSection() {
  return (
    <section className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-14 md:px-10 lg:py-20">
        {/* Title */}
        <div className="mb-10 max-w-3xl lg:mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">
            We deliver the best results, period.
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
            NUVORA students perform 3x better in class and school exams
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="aspect-[16/9] lg:aspect-auto">
            <Image
              src="https://images.unsplash.com/photo-1587614203976-365c74645e83?w=960&q=80"
              alt="Tutor working with a student"
              width={960}
              height={720}
              className="h-full w-full rounded-xl object-cover lg:h-auto"
            />
          </div>

          {/* Timeline */}
          <div>
            <div className="mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-brand-gold-dark">Steps</h3>
            </div>

            {STEPS.map((s, i) => (
              <div key={s.title} className="ms-1 flex gap-x-5">
                {/* Icon */}
                <div className="relative after:absolute after:inset-s-4 after:bottom-0 after:top-8 after:-translate-x-[0.5px] after:border-s after:border-ink-200 last:after:hidden">
                  <div className="relative z-10 flex size-8 items-center justify-center">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white text-xs font-bold uppercase text-brand-gold-dark">
                      {i + 1}
                    </span>
                  </div>
                </div>

                {/* Right content */}
                <div className="grow pb-8 pt-0.5 sm:pb-10">
                  <p className="text-sm text-ink-600 lg:text-base">
                    <span className="font-semibold text-ink-900">{s.title}:</span> {s.desc}
                  </p>
                </div>
              </div>
            ))}

            <Link
              href="/private-tuition"
              className="group mt-2 inline-flex items-center gap-x-2 rounded-full bg-brand-gold px-6 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-brand-gold-hover"
            >
              Get started today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
