import { examCards } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function ExamPrepGrid() {
  return (
    <section className="py-24 md:py-28 bg-surface-muted">
      <div className="container-x">
        <h2 className="text-3xl md:text-5xl font-extrabold text-ink-800 text-center mb-14 tracking-tight">
          Get expert help to ace your exam
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {examCards.map((card, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl text-center transition-all cursor-pointer min-h-[200px] flex items-center justify-center",
                card.featured
                  ? "bg-brand-blue text-white flex-col gap-3 p-10"
                  : "bg-white text-ink-800 text-lg md:text-2xl font-extrabold p-12 shadow-soft hover:-translate-y-1.5 hover:shadow-lift"
              )}
            >
              {card.featured ? (
                <>
                  <div className="text-2xl md:text-[26px] font-extrabold">{card.title}</div>
                  <div className="text-xs md:text-sm opacity-95 leading-relaxed max-w-[220px]">{card.subtitle}</div>
                  <div className="bg-white px-5 py-1.5 rounded-full text-xs font-bold text-brand-blue mt-2">Get Started</div>
                </>
              ) : (
                card.title
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}