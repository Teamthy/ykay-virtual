import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function GuaranteeBand() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      {/* subtle texture */}
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />

      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        {/* header */}
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.8rem)] leading-[0.95] tracking-[-0.02em] text-white uppercase">
            Consistent learning and expert-led programmes
          </h2>
        </div>

        {/* pill tabs */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-black/30 p-1.5 backdrop-blur">
            {[
              "British Curriculum",
              "Personal Tuition",
              "Exam Preparation",
              "Live Cohorts",
            ].map((tab, i) => (
              <button
                key={tab}
                className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${i === 1 ? "bg-[#D6FF57] text-[#0F2A1A]" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 3 cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6 max-w-[1200px] mx-auto">
          {/* left white card - steps */}
          <div className="rounded-[20px] bg-white p-6 lg:p-7 flex flex-col">
            <div className="space-y-7 flex-1">
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">1. SET YOUR GOALS</p>
                <p className="mt-2 text-[13px] leading-[1.5] text-[#0F2A1A]/70">
                  Share your learner&apos;s level, subjects and goals — JSS, SSS, UTME, WASSCE or IGCSE — to get started.
                </p>
              </div>
              <div className="h-px bg-black/10" />
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">2. GET YOUR PLAN</p>
                <p className="mt-2 text-[13px] leading-[1.5] text-[#0F2A1A]/70">
                  Receive a personalised learning plan — private tutor or live cohort — matched to curriculum and schedule.
                </p>
              </div>
              <div className="h-px bg-black/10" />
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">3. LEARN & SEE RESULTS</p>
                <p className="mt-2 text-[13px] leading-[1.5] text-[#0F2A1A]/70">
                  Follow your plan with live lessons, recordings, assignments and parent reports. Escrow-protected.
                </p>
              </div>
            </div>
          </div>

          {/* middle lime PRO */}
          <div className="rounded-[20px] bg-[#D6FF57] p-6 lg:p-7 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0F2A1A]">PRO</p>
                <p className="mt-1 text-[11px] leading-[1.4] text-[#0F2A1A]/70 max-w-[22ch]">For families who want 1-on-1 consistency and faster progress</p>
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A]">POPULAR</div>
            </div>

            <div className="mt-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <span className="text-[18px] font-extrabold leading-none text-[#0F2A1A]">$45</span>
                <span className="text-[12px] text-[#0F2A1A]/60">/ month</span>
                <span className="ml-2 grid size-6 place-items-center rounded-full bg-[#0F2A1A]">
                  <span className="size-3 rounded-full bg-[#D6FF57]" />
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#0F2A1A]/60">Billed monthly · Cancel anytime</p>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {[
                "4 sessions per week",
                "Personalised learning plan",
                "Assignments & feedback",
                "Parent reports & escrow",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-[#0F2A1A]">
                  <span className="size-1.5 rounded-full bg-[#0F2A1A]" /> {f}
                </li>
              ))}
            </ul>

            <Link href="/private-tuition" className="mt-7 inline-flex w-full items-center justify-between rounded-full bg-[#0F2A1A] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-black">
              <span>Get Started</span>
              <span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>

          {/* right white STARTER */}
          <div className="rounded-[20px] bg-white p-6 lg:p-7 flex flex-col">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0F2A1A]">STARTER</p>
              <p className="mt-1 text-[11px] leading-[1.4] text-[#0F2A1A]/60 max-w-[22ch]">For learners who want structured cohorts and peer learning</p>
            </div>

            <div className="mt-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A]/5 px-3 py-2">
                <span className="text-[18px] font-extrabold leading-none text-[#0F2A1A]">$25</span>
                <span className="text-[12px] text-[#0F2A1A]/60">/ month</span>
                <span className="ml-2 grid size-6 place-items-center rounded-full bg-[#0F2A1A]">
                  <span className="size-3 rounded-full bg-white" />
                </span>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {[
                "2 sessions per week",
                "Live cohort + recordings",
                "Basic progress tracking",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-[#0F2A1A]">
                  <span className="size-1.5 rounded-full bg-[#0F2A1A]/30" /> {f}
                </li>
              ))}
            </ul>

            <Link href="/cohorts" className="mt-7 inline-flex w-full items-center justify-between rounded-full bg-[#0F2A1A] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-black">
              <span>Get Started</span>
              <span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
