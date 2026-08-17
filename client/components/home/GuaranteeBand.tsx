import { ShieldCheck } from "lucide-react";

// Escrow commitment — no invented “100% satisfaction” legal guarantee.

export function GuaranteeBand() {
  return (
    <section className="py-14 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="overflow-hidden rounded-3xl bg-brand-gold px-8 py-12 text-center text-ink-900 shadow-brand md:px-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/10">
            <ShieldCheck size={26} className="text-brand-gold" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">
            Fees sit in escrow until lessons are delivered
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-800/80 leading-relaxed">
            Tuition is held until the lesson happens. If something goes wrong, we
            work with you and the tutor to put it right — we do not advertise a
            blanket satisfaction statistic.
          </p>
        </div>
      </div>
    </section>
  );
}
