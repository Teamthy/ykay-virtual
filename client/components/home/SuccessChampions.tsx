import { Star } from "lucide-react";

// "Meet our UTME champions!" (reference 003930) — top performers with
// 5-star ratings; their success as social proof for exam prep.

const CHAMPIONS = [
  { name: "Omoloja Olumuyiwa Eghosa", school: "King's College, Lagos", score: "345 / 400" },
  { name: "Chinonso Madueke", school: "Queens College, Lagos", score: "338 / 400" },
  { name: "Adebayo Olamide", school: "Grange School, Ikeja", score: "331 / 400" },
];

export function SuccessChampions() {
  return (
    <section className="py-16 bg-surface-muted">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark text-center">
          Class of 2025
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy text-center">
          Meet our UTME champions!
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-600">
          These exceptional students crushed the 2025 UTME with our proven methodology. Their
          success can be <b>your</b> story next year!
        </p>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {CHAMPIONS.map((c) => (
            <div key={c.name} className="rounded-2xl border border-ink-100 bg-white p-7 text-center shadow-soft">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-navy to-brand-blue text-lg font-extrabold text-white">
                {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="mt-3 flex items-center justify-center gap-0.5 text-brand-gold" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 font-bold text-brand-navy">{c.name}</p>
              <p className="text-xs text-ink-500">{c.school}</p>
              <p className="mt-3 inline-block rounded-full bg-brand-gold-light px-4 py-1 text-sm font-extrabold text-brand-navy">
                {c.score}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
