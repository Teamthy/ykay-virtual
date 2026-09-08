import Link from "next/link";
import { ArrowRight, CreditCard, Handshake, ShieldCheck, Unlock } from "lucide-react";

const STEPS = [
  {
    icon: CreditCard,
    title: "You pay",
    body: "Tuition is collected when you enrol — not handed to the tutor on day one.",
  },
  {
    icon: ShieldCheck,
    title: "We hold it",
    body: "Fees sit in escrow until the lesson or cohort session actually happens.",
  },
  {
    icon: Unlock,
    title: "Then we release",
    body: "After delivery, the tutor is paid. If something goes wrong, we work it through with both of you.",
  },
];

export function GuaranteeBand() {
  return (
    <section className="relative isolate w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home/ribs-cream.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#FFF7E4] via-[#FFF7E4]/88 to-[#DFFFF2]/55" />

      <div className="relative z-10 grid w-full items-center lg:grid-cols-2">
        <div className="px-6 py-16 md:px-12 md:py-24 lg:px-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-deep-green/15 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-deep-green">
            <Handshake size={12} /> Protected payments
          </p>
          <h2 className="mt-5 max-w-[14ch] font-display text-[clamp(2.2rem,5.5vw,4.4rem)] leading-[0.92] tracking-[-0.02em] text-deep-green">
            Fees sit in escrow until lessons are delivered.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-700">
            Tuition is held until the lesson happens. If something goes wrong, we
            work with you and the tutor to put it right — we do not advertise a
            blanket satisfaction statistic.
          </p>
          <Link
            href="/how-it-works"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-deep-green px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-primary transition hover:bg-[#024d2c]"
          >
            How payments work <ArrowRight size={14} />
          </Link>
        </div>

        <ol className="grid gap-3 px-6 pb-16 md:px-12 lg:px-16 lg:py-24">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-3xl border border-deep-green/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-deep-green text-primary">
                <step.icon size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-deep-green/50">
                  Step {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 font-display text-2xl leading-none text-deep-green">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
