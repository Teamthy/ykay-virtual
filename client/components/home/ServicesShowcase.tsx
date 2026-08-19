import Link from "next/link";
import { Home, Globe2, GraduationCap, BookOpenCheck, Star, FileCheck } from "lucide-react";

// Services showcase - Tuteria v2 "Popular services" rail: six flagship
// offers with real reference copy.

const SERVICES = [
  {
    icon: <Home size={20} />,
    label: "Home Tutoring",
    desc: "One-on-one lessons in the comfort of your home",
    href: "/hometutors",
    photo: "/hero/home-tutoring.jpg",
  },
  {
    icon: <Globe2 size={20} />,
    label: "International Tutoring",
    desc: "British and Nigerian curricula with a vetted tutor",
    href: "/private-tuition",
    photo: "/hero/international.jpg",
  },
  {
    icon: <GraduationCap size={20} />,
    label: "UTME 2026",
    desc: "Live class, recordings and CBT-style mocks",
    href: "/utme-2026",
    photo: "/hero/utme.jpg",
  },
  {
    icon: <BookOpenCheck size={20} />,
    label: "Test Prep",
    desc: "GMAT, GRE, SAT, ACT and entrance exams",
    href: "/exam-prep",
    photo: "/hero/exam-prep.jpg",
  },
  {
    icon: <Star size={20} />,
    label: "NUVORA Plus",
    desc: "Priority matching with vetted specialist tutors",
    href: "/pricing",
    photo: "/hero/nuvora-plus.jpg",
  },
  {
    icon: <FileCheck size={20} />,
    label: "Entrance Exam",
    desc: "WAEC, IGCSE, 11+, Common Entrance, SAT",
    href: "/exam-prep",
    photo: "/hero/entrance-exam.jpg",
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
              className="group overflow-hidden rounded-2xl border border-ink-100 bg-cover bg-center p-5 text-white shadow-soft"
              style={{
                backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.78), rgba(1,57,32,0.55)), url(${s.photo ?? "/hero/programmes.jpg"})`,
              }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white">
                {s.icon}
              </div>
              <p className="mt-3 font-bold leading-tight text-white">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/80">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
