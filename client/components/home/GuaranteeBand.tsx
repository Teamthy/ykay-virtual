"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TABS = [
  { id: "british", label: "British Curriculum" },
  { id: "personal", label: "Personal Tuition" },
  { id: "exam", label: "Exam Preparation" },
  { id: "cohorts", label: "Live Cohorts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CONTENT: Record<TabId, { title: string; cards: { kicker: string; title: string; desc: string; price?: string; features: string[]; href: string; lime?: boolean }[] }> = {
  british: {
    title: "British pathway built for IGCSE & A-Level results",
    cards: [
      {
        kicker: "01 · SET YOUR GOALS",
        title: "Year 7-13 assessment",
        desc: "We assess current level, target grades and learning style to build your British pathway.",
        features: ["IGCSE · A-Level", "Year 7-9 foundation", "Progress tracking"],
        href: "/curricula/british",
      },
      {
        kicker: "PRO · 1-ON-1",
        title: "British Curriculum Private",
        desc: "Personalised 1-on-1 with British curriculum specialists. 4 sessions/week + assignments.",
        price: "$55 / month",
        features: ["4 sessions/week", "IGCSE past papers", "Parent reports", "Escrow protected"],
        href: "/curricula/british",
        lime: true,
      },
      {
        kicker: "STARTER · COHORT",
        title: "British Cohort Live",
        desc: "Small group live classes, recordings, and peer learning. 2 sessions/week.",
        price: "$30 / month",
        features: ["2 sessions/week", "Live + recorded", "Basic tracking"],
        href: "/curricula/british",
      },
    ],
  },
  personal: {
    title: "Private tuition matched to your learner, not the other way round",
    cards: [
      {
        kicker: "01 · SET YOUR GOALS",
        title: "Share goals & schedule",
        desc: "Tell us subjects, level, availability and budget. We match you with vetted tutors in 24h.",
        features: ["Any age · Any level", "Online or at home", "Vetted tutors"],
        href: "/private-tuition",
      },
      {
        kicker: "PRO · MOST POPULAR",
        title: "Private Tuition Pro",
        desc: "4 sessions/week, personalised plan, assignments, feedback and parent reports.",
        price: "$45 / month",
        features: ["4 sessions/week", "Personalised plan", "Assignments & feedback", "Parent reports & escrow"],
        href: "/private-tuition",
        lime: true,
      },
      {
        kicker: "STARTER · FLEXIBLE",
        title: "Starter Tuition",
        desc: "2 sessions/week for light support and homework help.",
        price: "$25 / month",
        features: ["2 sessions/week", "Homework help", "Basic tracking"],
        href: "/private-tuition",
      },
    ],
  },
  exam: {
    title: "Exam prep that simulates the real hall — then beats it",
    cards: [
      {
        kicker: "01 · DIAGNOSE",
        title: "Timed diagnostic",
        desc: "Sit a full past paper under timed conditions. Instant scoring + weak-area map.",
        features: ["UTME · WASSCE · IGCSE", "Instant results", "Weak-area analysis"],
        href: "/exam-prep",
      },
      {
        kicker: "PRO · INTENSIVE",
        title: "Exam Intensive",
        desc: "Daily drills, weekly mocks, tutor clinics. Built for score jumps.",
        price: "$60 / month",
        features: ["Daily CBT drills", "Weekly mocks", "Tutor clinics", "Score guarantee support"],
        href: "/exam-prep",
        lime: true,
      },
      {
        kicker: "STARTER · PRACTICE",
        title: "CBT Practice",
        desc: "Past questions with explanations. Practice anytime, anywhere.",
        price: "$15 / month",
        features: ["10 years past questions", "Explanations", "Progress tracking"],
        href: "/login?next=/lms/practice",
      },
    ],
  },
  cohorts: {
    title: "Live cohorts — structured, small, and recorded for replay",
    cards: [
      {
        kicker: "01 · CHOOSE COHORT",
        title: "Pick your term",
        desc: "Browse published cohorts by level, subject and start date. Limited seats to keep classes focused.",
        features: ["JSS to SS3", "Live + recorded", "Assignments & reports"],
        href: "/cohorts",
      },
      {
        kicker: "PRO · FULL TERM",
        title: "Cohort Pro",
        desc: "Full term access, live lessons, recordings, assignments, parent reports.",
        price: "$40 / month",
        features: ["Live + recordings", "Assignments", "Parent reports", "Certificate"],
        href: "/cohorts",
        lime: true,
      },
      {
        kicker: "STARTER · TRIAL",
        title: "Cohort Starter",
        desc: "Try a cohort for 2 weeks. Switch to Pro anytime.",
        price: "$20 / month",
        features: ["2 weeks access", "Live lessons", "Basic tracking"],
        href: "/cohorts",
      },
    ],
  },
};

export function GuaranteeBand() {
  const [active, setActive] = useState<TabId>("personal");
  const data = CONTENT[active];

  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />

      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="font-display text-[clamp(1.6rem,3.2vw,2.8rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase">
            Consistent learning and expert-led programmes
          </h2>
        </div>

        {/* tabs */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1.5 rounded-full bg-black/30 p-1.5 backdrop-blur">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`rounded-full px-5 py-2.5 text-[12px] font-bold transition ${active === t.id ? "bg-[#D6FF57] text-[#0F2A1A] shadow-sm" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-white/60 max-w-[60ch] mx-auto">{data.title}</p>

        {/* cards */}
        <div className="mt-8 grid gap-5 md:grid-cols-3 max-w-[1200px] mx-auto">
          {data.cards.map((card, idx) => (
            <div key={idx} className={`rounded-[20px] p-6 lg:p-7 flex flex-col min-h-[380px] ${card.lime ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-white text-[#0F2A1A]"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wide">{card.kicker}</p>
                {card.lime && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold">POPULAR</span>}
              </div>

              <h3 className="mt-4 font-display text-[20px] leading-[0.95] uppercase">{card.title}</h3>
              <p className="mt-3 text-[13px] leading-[1.5] opacity-70">{card.desc}</p>

              {card.price && (
                <div className="mt-5">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${card.lime ? "bg-white" : "bg-[#0F2A1A]/5"}`}>
                    <span className="text-[18px] font-extrabold leading-none">{card.price.split(" /")[0]}</span>
                    <span className="text-[12px] opacity-60">/ month</span>
                    <span className="ml-1 grid size-6 place-items-center rounded-full bg-[#0F2A1A]"><span className={`size-3 rounded-full ${card.lime ? "bg-[#D6FF57]" : "bg-white"}`} /></span>
                  </div>
                </div>
              )}

              <ul className="mt-6 space-y-2 flex-1">
                {card.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] font-medium">
                    <span className={`size-1.5 rounded-full ${card.lime ? "bg-[#0F2A1A]" : "bg-[#0F2A1A]/30"}`} /> {f}
                  </li>
                ))}
              </ul>

              <Link href={card.href} className={`mt-6 inline-flex w-full items-center justify-between rounded-full px-5 py-3 text-[13px] font-bold transition ${card.lime ? "bg-[#0F2A1A] text-white hover:bg-black" : "bg-[#0F2A1A] text-white hover:bg-black"}`}>
                <span>Get Started</span>
                <span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={14} /></span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
