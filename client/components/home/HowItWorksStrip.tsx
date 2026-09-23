import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap, Search, CreditCard, BookOpen } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Choose your track",
    body: "Browse programmes, live cohorts or vetted tutors. Filter by curriculum — British, Nigerian, or exam prep.",
    points: ["JSS to SS3", "UTME / WASSCE", "Private tuition"],
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Enrol securely",
    body: "Secure your spot with escrow-protected payment. Wallet, receipts and parent approvals in one place.",
    points: ["Escrow hold", "Instant receipt", "Parent approval"],
  },
  {
    n: "03",
    icon: BookOpen,
    title: "Learn live",
    body: "Join live lessons, access recordings, submit assignments and chat with tutors. Everything in the LMS.",
    points: ["Live + recorded", "Assignments", "Chat & support"],
  },
  {
    n: "04",
    icon: GraduationCap,
    title: "Track progress",
    body: "Parents get attendance, scores and tutor reports. Students earn certificates and keep momentum.",
    points: ["Attendance", "Reports", "Certificates"],
  },
];

export function HowItWorksStrip() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{"<<"} How it works {">>"}</p>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase max-w-[16ch]">
                Four steps to better learning
              </h2>
              <p className="mt-3 max-w-[48ch] text-[14px] leading-[1.6] text-white/60">From discovery to progress reports — a simple, trusted flow for families and tutors.</p>
            </div>
            <Link href="/how-it-works" className="hidden md:inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#D6FF57]">
              Full walkthrough <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="group rounded-[20px] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
                <div className="flex items-start justify-between">
                  <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white">
                    <s.icon size={16} />
                  </div>
                  <span className="text-[11px] font-extrabold tracking-wide text-[#0F2A1A]/30">{s.n}</span>
                </div>
                <h3 className="mt-5 font-display text-[16px] leading-[1] text-[#0F2A1A] uppercase">{s.title}</h3>
                <p className="mt-2 text-[12px] leading-[1.5] text-[#0F2A1A]/60">{s.body}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F2A1A]/70">
                      <CheckCircle2 size={12} className="text-[#0F2A1A]" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
