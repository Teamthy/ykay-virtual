import { ShieldCheck } from "lucide-react";

// "100% Satisfaction Guaranteed — we've got you covered" (references 003209 +
// 003831): commitment band with escrow promise.

export function GuaranteeBand() {
  return (
    <section className="py-14 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy to-brand-blue px-8 py-12 text-center text-white shadow-brand md:px-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck size={26} className="text-brand-gold" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">
            100% Satisfaction Guaranteed
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/75 leading-relaxed">
            We&apos;ve got you covered. We are committed to your success and always do our best to
            ensure you achieve your goals — your tuition fees sit in escrow until lessons are
            delivered, and if you&apos;re not happy, we&apos;ll work to make it right.
          </p>
        </div>
      </div>
    </section>
  );
}
