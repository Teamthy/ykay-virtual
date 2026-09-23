import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Heart, ShieldCheck, BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Parent Guide - Support Learning at Home | YK-Virtual" };

export default function ParentGuidePage() {
  return (
    <main className="w-full overflow-hidden">
      <PageHero eyebrow="Parent Guide" title="Proven strategies to support learning and maintain motivation at home" subtitle="How parents use YK-Virtual to stay visible, supportive and consistent — without micromanaging." crumbs={[{ name: "Home", href: "/" }, { name: "Parent Guide" }]} ctas={[{ label: "Create family account", href: "/onboarding", primary: true }, { label: "How it works", href: "/how-it-works" }]} />

      <section className="w-full bg-[#F9F6ED] py-12 lg:py-20">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-[1200px] grid gap-6 lg:grid-cols-3">
            {[
              { icon: Heart, title: "Motivation, not pressure", body: "Celebrate effort and consistency. Use our weekly goals to keep momentum, not stress." },
              { icon: BarChart3, title: "Visibility", body: "Attendance, scores and tutor notes land in your dashboard. No need to ask — you see progress." },
              { icon: ShieldCheck, title: "Safe & escrow-protected", body: "Payments held until lessons happen. Messaging is restricted and monitored for safety." },
            ].map((c) => (
              <div key={c.title} className="rounded-[20px] bg-white p-6 border border-black/10">
                <div className="grid size-10 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><c.icon size={16} /></div>
                <h3 className="mt-4 font-display text-[18px] uppercase text-[#0F2A1A]">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/60">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[20px] bg-white p-6 border border-black/10">
              <h3 className="font-display text-[18px] uppercase text-[#0F2A1A]">Weekly check-in (10 mins)</h3>
              <ul className="mt-4 space-y-3">
                {["Review attendance & assignments", "Ask: what was hard this week?", "Set 2 goals with your child for next week", "Message tutor if needed — all in one inbox"].map((s) => (
                  <li key={s} className="flex gap-2 text-[13px] text-[#0F2A1A]/70"><CheckCircle2 size={14} className="mt-0.5 text-[#0F2A1A]" /> {s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[20px] bg-[#0F2A1A] p-6 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">For schools & parents</p>
              <h3 className="mt-2 font-display text-[20px] leading-none uppercase">Partner with YK-Virtual</h3>
              <p className="mt-2 text-[13px] text-white/60">We work with schools and families to deliver consistent learning, reports and safeguarding.</p>
              <Link href="/for-schools" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-[12px] font-bold text-[#0F2A1A]">Learn more <ArrowRight size={12} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
