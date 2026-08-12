import Link from "next/link";
import { Users, Wallet, GraduationCap } from "lucide-react";

// Become-a-tutor community proof (reference 001426): earnings made, hours
// taught, students impacted + "You belong here" headline.

const STATS = [
  { icon: <Wallet size={18} />, value: "₦358M+", label: "Earnings made by tutors" },
  { icon: <GraduationCap size={18} />, value: "516k+", label: "Lesson hours taught" },
  { icon: <Users size={18} />, value: "23,235", label: "Total students impacted" },
];

export function TutorCommunityStats() {
  return (
    <section className="py-16 bg-surface-muted">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">You belong here</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy">
          Join the largest community of professional tutors
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-ink-600">
          NUVORA makes tutoring prestigious and financially rewarding — with a constant
          stream of students, escrow-protected weekly payouts and a team that supports you.
        </p>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-7 shadow-soft">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                {s.icon}
              </div>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy">{s.value}</p>
              <p className="mt-1 text-sm font-semibold text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
        <Link href="/become-tutor/apply" className="mt-10 inline-block rounded-xl bg-[#111111] px-8 py-4 text-sm font-bold text-white hover:bg-brand-blue transition-colors">
          Become a tutor
        </Link>
      </div>
    </section>
  );
}
