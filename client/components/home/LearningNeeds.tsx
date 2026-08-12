import Link from "next/link";
import { Home, MonitorPlay, GraduationCap, Baby, FileCheck } from "lucide-react";

// "No matter the learning need, there's a tutor for your child" (reference
// 003743) — five needs as tappable cards.

const NEEDS = [
  { icon: <Home size={20} />, label: "Physical One-on-One Lessons", href: "/private-tuition" },
  { icon: <MonitorPlay size={20} />, label: "Online One-on-One Lessons", href: "/online-classes" },
  { icon: <GraduationCap size={20} />, label: "Homeschooling", href: "/curricula/nigerian" },
  { icon: <Baby size={20} />, label: "Early Years Foundation", href: "/curricula/british" },
  { icon: <FileCheck size={20} />, label: "Exam Preparation", href: "/exam-prep" },
];

export function LearningNeeds() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark text-center">
          Every learning need covered
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy text-center">
          No matter the learning need, there&apos;s a tutor for your child!
        </h2>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4">
          {NEEDS.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="group rounded-2xl border border-ink-100 bg-surface-muted p-6 text-center transition-all hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-card"
            >
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue transition-colors group-hover:bg-brand-navy group-hover:text-white">
                {n.icon}
              </div>
              <p className="mt-3 text-sm font-bold leading-snug text-ink-800">{n.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
