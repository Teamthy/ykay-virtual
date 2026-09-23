import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, BookOpen, Target } from "lucide-react";

export const metadata: Metadata = { title: "Study Skills - Build a Consistent Routine | YK-Virtual" };

const TIPS = [
  { title: "Time blocking", body: "Split study into 45-min blocks with 10-min breaks. Consistent slots beat cramming." },
  { title: "Active recall", body: "Close the book and write what you remember. Retrieval strengthens memory 2x faster." },
  { title: "Interleaving", body: "Mix subjects in one session — e.g., Maths + English + Science — to improve retention." },
  { title: "Weekly review", body: "Every Sunday, review the week's notes and set 3 goals for next week." },
];

export default function StudySkillsPage() {
  return (
    <main className="w-full overflow-hidden">
      <PageHero eyebrow="Study Skills" title="How to build a consistent study routine that actually works" subtitle="For JSS & SSS learners — British and Nigerian curricula. Practical, parent-friendly, and built for real results." crumbs={[{ name: "Home", href: "/" }, { name: "Study Skills" }]} ctas={[{ label: "Browse programmes", href: "/programmes", primary: true }, { label: "How it works", href: "/how-it-works" }]} />

      <section className="w-full bg-[#F9F6ED] py-12 lg:py-20">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-[1200px] grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">{"<<"} The method {">>"}</p>
              <h2 className="mt-3 font-display text-[28px] leading-[0.9] uppercase text-[#0F2A1A] max-w-[20ch]">Consistency beats intensity — every time</h2>
              <div className="mt-8 grid gap-4">
                {TIPS.map((t) => (
                  <div key={t.title} className="rounded-[16px] bg-white p-5 border border-black/10">
                    <h3 className="font-bold text-[#0F2A1A] flex items-center gap-2"><CheckCircle2 size={14} className="text-[#0F2A1A]" /> {t.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/65">{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[20px] bg-white p-6 shadow">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65"><Clock size={12} /> Daily routine</div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {["4:00-4:45 PM Maths (active recall)", "5:00-5:45 PM English (past questions)", "6:00-6:30 PM Review & plan tomorrow"].map((s) => (
                    <li key={s} className="flex gap-2"><span className="size-1.5 rounded-full bg-[#0F2A1A] mt-2" /> {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[20px] bg-[#0F2A1A] p-6 text-white">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">Need a tutor?</p>
                <h3 className="mt-2 font-display text-[20px] leading-none uppercase">Get a personalised study plan</h3>
                <p className="mt-2 text-[13px] text-white/60">We match you with a vetted tutor who builds your routine around your goals.</p>
                <Link href="/private-tuition" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-[12px] font-bold text-[#0F2A1A]">Request tuition <ArrowRight size={12} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
