import { Star } from "lucide-react";

// "Meet Our UTME Champions!" — tuteriaprep real champions with quotes.

const CHAMPIONS = [
  {
    name: "Omoloja Olumuyiwa Eghosa",
    school: "UTME Score: 341/400",
    quote:
      "Preparing for UTME a second time was tough emotionally. Tuteria gave me hope — the structured prep, daily practice, and constant support helped me believe in myself, and I didn't just pass, I soared.",
    combo: "Use of English · Maths · Chemistry · Physics",
  },
  {
    name: "Chinonso Madueke",
    school: "UTME Score: 338/400",
    quote:
      "I came into this unsure of what to expect, but NUVORA changed everything. The tutors believed in me, even when I doubted myself. Every session built my confidence.",
    combo: "Use of English · Physics · Chemistry · Biology",
  },
  {
    name: "Princess Lanre-Akinremi",
    school: "UTME Score: 317/400",
    quote:
      "This was my first time writing UTME and the intense prep and constant encouragement pushed me beyond what I thought I could do. I feel empowered, proud, and incredibly grateful.",
    combo: "Use of English · Physics · Chemistry · Biology",
  },
];

export function SuccessChampions() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-2xl tracking-[0.02em] text-[#0A033C] md:text-3xl">
            Meet Our UTME Champions! 🏆
          </p>
          <p className="mt-3 text-ink-600">
            These exceptional students crushed the 2025 UTME with our proven methodology. Their
            success can be <b>your</b> story next year!
          </p>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {CHAMPIONS.map((c) => (
            <div key={c.name} className="flex flex-col rounded-3xl border border-ink-100 bg-surface-muted p-7">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0A033C] to-[#7C3AED] font-display text-lg text-white">
                  {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="font-bold leading-tight text-ink-800">{c.name}</p>
                  <p className="text-xs font-semibold text-[#FF6636]">{c.school}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-brand-gold" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm italic leading-relaxed text-ink-600">&ldquo;{c.quote}&rdquo;</p>
              <p className="mt-4 border-t border-ink-100 pt-3 text-xs font-semibold text-ink-500">
                Subject Combination: <span className="text-ink-700">{c.combo}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
