import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Trophy, Target, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Exam Strategy - Revision Habits | YK-Virtual" };

export default function ExamStrategyPage() {
  return (
    <main className="w-full overflow-hidden">
      <PageHero cover="/hero/exam-prep.jpg" eyebrow="Exam Strategy" title="Simple revision habits to boost energy, focus and exam results" subtitle="UTME, WASSCE, NECO, IGCSE — timed CBT, past questions, and tutor clinics that build real exam confidence." crumbs={[{ name: "Home", href: "/" }, { name: "Exam Strategy" }]} ctas={[{ label: "Start CBT practice", href: "/login?next=/lms/practice", primary: true }, { label: "View exam prep", href: "/exam-prep" }]} />

      <section className="w-full bg-[#F9F6ED] py-12 lg:py-20">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-[1200px] grid gap-8 lg:grid-cols-3">
            {[
              { icon: Target, title: "Timed CBT", body: "Simulate exam hall conditions with instant scoring and explanations. 10 years of verified past questions." },
              { icon: Clock, title: "Spaced revision", body: "30-min daily drills + weekly full mocks. Consistency beats last-minute cramming." },
              { icon: Trophy, title: "Tutor clinics", body: "Weekly review of weak areas with expert tutors. Focus on what moves your score." },
            ].map((c) => (
              <div key={c.title} className="rounded-[20px] bg-white p-6 border border-black/10">
                <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><c.icon size={16} /></div>
                <h3 className="mt-4 font-display text-[18px] uppercase text-[#0F2A1A]">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/65">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[20px] bg-[#0F2A1A] p-8 text-white flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">Proven results</p>
              <h3 className="mt-2 font-display text-[24px] leading-none uppercase max-w-[20ch]">Most families see score jumps in 4-6 weeks</h3>
              <p className="mt-2 text-[13px] text-white/60">With consistent CBT + tutor feedback, confidence and scores improve fast.</p>
            </div>
            <Link href="/exam-prep" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A]">Explore exam prep <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
