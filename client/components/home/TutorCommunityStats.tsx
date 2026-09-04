import Link from "next/link";
import { Users, Wallet, GraduationCap } from "lucide-react";

import { AnimatedText } from "@/components/ui/animated-text";
// Qualitative tutor pitch - no invented earnings / hours / student counts.

const POINTS = [
  {
    icon: <Wallet size={18} />,
    title: "Escrow-protected payouts",
    body: "Lesson fees release after delivery, on a weekly payout cadence.",
  },
  {
    icon: <GraduationCap size={18} />,
    title: "Online and in-person",
    body: "Teach from home or visit families across Lagos and other Nigerian cities.",
  },
  {
    icon: <Users size={18} />,
    title: "A team behind you",
    body: "Vetting, matching and support so you can focus on teaching.",
  },
];

export function TutorCommunityStats() {
  return (
    <section className="py-16 bg-surface-muted">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">
          You belong here
        </p>
        <AnimatedText
          as="h2"
          className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy"
          text="Teach with YK-Virtual"
        />
        <p className="mt-3 max-w-2xl mx-auto text-ink-600">
          YK-Virtual is building a Nigeria-first tutoring marketplace -
          escrow-protected payouts and a support team, without inflated
          community numbers.
        </p>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {POINTS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-ink-100 bg-white p-7 shadow-soft"
            >
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                {s.icon}
              </div>
              <p className="mt-4 text-lg font-extrabold tracking-tight text-brand-navy">
                {s.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-500">
                {s.body}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/become-tutor/apply"
          className="mt-10 inline-block rounded-xl bg-[#111111] px-8 py-4 text-sm font-bold text-white hover:bg-brand-blue transition-colors"
        >
          Become a tutor
        </Link>
      </div>
    </section>
  );
}
