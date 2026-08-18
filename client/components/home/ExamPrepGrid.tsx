import Link from "next/link";
import { examCards } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// Exam prep grid (Batch 2) - every card is a link to its fully built prep
// page with the blue hover + "Get Started" affordance (requested UX).

export function ExamPrepGrid() {
  return (
    <section className="bg-surface-muted py-24 md:py-28">
      <div className="container-x">
        <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-ink-800 md:text-5xl">
          Get expert help to ace your exam
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {examCards.map((card, i) => (
            <Link
              key={i}
              href={card.href}
              className="group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-white p-8 text-center text-ink-800 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:bg-brand-blue hover:text-white hover:shadow-lift"
            >
              <div className="text-lg font-extrabold md:text-2xl">{card.title}</div>
              {/* Revealed on hover - the blue hover with the CTA */}
              <div className="mt-3 translate-y-1 rounded-full border border-white/40 px-5 py-1.5 text-xs font-bold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                Get Started →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
