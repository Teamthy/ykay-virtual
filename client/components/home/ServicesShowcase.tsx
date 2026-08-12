import Link from "next/link";
import { Home, Globe2, GraduationCap, BookOpenCheck, Star, FileCheck } from "lucide-react";

// Services showcase — Tuteria v2 "Popular services" rail: six flagship
// offers with real reference copy.

const SERVICES = [
  {
    icon: <Home size={20} />,
    label: "Home Tutoring",
    desc: "One-on-one lessons in the comfort of your home",
    href: "/hometutors",
    bg: "#E6F0FA",
    color: "#194F82",
  },
  {
    icon: <Globe2 size={20} />,
    label: "International Tutoring",
    desc: "Foreign-standard learning, local prices",
    href: "/private-tuition",
    bg: "#FDF0E8",
    color: "#ED6D20",
  },
  {
    icon: <GraduationCap size={20} />,
    label: "UTME 2026",
    desc: "Your best chance at a 300+ score",
    href: "/utme-2026",
    bg: "#F2F9EE",
    color: "#009A49",
  },
  {
    icon: <BookOpenCheck size={20} />,
    label: "Test Prep",
    desc: "IELTS, GRE, GMAT, TEF & more",
    href: "/exam-prep",
    bg: "#FFF8E6",
    color: "#C9A227",
  },
  {
    icon: <Star size={20} />,
    label: "NUVORA Plus",
    desc: "Top 5% of tutors nationwide",
    href: "/pricing",
    bg: "#E6F0FA",
    color: "#056FD2",
  },
  {
    icon: <FileCheck size={20} />,
    label: "Entrance Exam",
    desc: "WAEC, IGCSE, 11+, Common Entrance, SAT",
    href: "/exam-prep",
    bg: "#FDF0E8",
    color: "#C8102E",
  },
];

export function ServicesShowcase() {
  return (
    <section className="border-t border-ink-100 bg-white py-12">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
            Popular services
          </h2>
          <Link href="/programmes" className="text-sm font-bold text-brand-blue hover:text-brand-navy">
            See all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-2xl border border-ink-100 p-5 transition-all hover:-translate-y-1 hover:shadow-card"
              style={{ backgroundColor: s.bg }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-navy shadow-soft">
                {s.icon}
              </div>
              <p className="mt-3 font-bold leading-tight text-ink-800">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
