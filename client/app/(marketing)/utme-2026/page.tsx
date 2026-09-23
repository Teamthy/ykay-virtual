import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { UtmeCallbackForm } from "@/features/programmes/components/UtmeCallbackForm";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import {
  ArrowRight,
  Check,
  BrainCircuit,
  FileCheck2,
  CalendarCheck2,
  LifeBuoy,
  Trophy,
  BookOpen,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 prep - live class, mocks, reports | YK-Virtual",
  description:
    "JAMB/UTME prep on virtual.ykaycollege.com: live lessons, recordings, timed mocks and parent notes. Same login on mobile. No score guarantee.",
  path: "/utme-2026",
});

const INCLUDED = [
  {
    icon: CalendarCheck2,
    title: "Live, expert-led classes",
    desc: "Work through the syllabus with a tutor in interactive online lessons. Recordings are available for revision.",
  },
  {
    icon: FileCheck2,
    title: "Topic practice",
    desc: "Practise from past-question patterns, then focus on the topics that need a little more time.",
  },
  {
    icon: BrainCircuit,
    title: "Timed CBT mocks",
    desc: "Get comfortable with the format and build confidence working under exam conditions.",
  },
  {
    icon: LifeBuoy,
    title: "Help when you need it",
    desc: "Remedial office hours and a moderated peer space keep questions from becoming roadblocks.",
  },
];

const PACKAGES = [
  {
    name: "UTME Mastery",
    price: "₦35,000",
    featured: false,
    features: [
      "Live classes + recordings you can rewatch on your phone",
      "Topic drills from past-paper patterns",
      "Weekly timed CBT-style mocks",
      "Weekly report for parents",
    ],
  },
  {
    name: "UTME Plus",
    price: "₦52,500",
    featured: true,
    features: [
      "Everything in Mastery",
      "Remedial office hours",
      "Smaller group + named mentor",
      "Priority advisor replies",
    ],
  },
];

const SUBJECTS = ["Use of English", "Mathematics", "Physics", "Chemistry", "Biology"];

export default function Utme2026Page() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "UTME 2026 Prep", item: "https://virtual.ykaycollege.com/utme-2026" },
  ]);
  const course = courseJsonLd({
    name: "YK-Virtual JAMB 2026 Preparation Programme",
    description:
      "UTME prep on virtual.ykaycollege.com: live lessons, recordings, timed mocks and parent notes. No score guarantee.",
    provider: "YK-Virtual",
    url: "https://virtual.ykaycollege.com/utme-2026",
  });

  return (
    <main className="bg-[#F9F6ED]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      {/* Full-bleed forest hero. Keep the photo behind a dark scrim so the
          heading stays readable at every viewport width. */}
      <section className="relative isolate w-full overflow-hidden bg-[#0F2A1A] text-white">
        {/* Matching card cover, consistent with the "Find your track" rail. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/card-utme.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-30 lg:object-right" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0F2A1A] via-[#0F2A1A]/95 to-[#0F2A1A]/65" />
        <div aria-hidden="true" className="absolute -right-32 top-0 size-[500px] rounded-full bg-[#D6FF57]/10 blur-[100px]" />

        <div className="container-x relative grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-14 lg:py-24">
          <div className="max-w-[780px]">
            <nav aria-label="Breadcrumb" className="mb-9 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-white/65">
              <Link href="/" className="text-white/65 hover:text-[#D6FF57]">Home</Link>
              <span aria-hidden="true">/</span>
              <span className="text-[#D6FF57]">UTME 2026 prep</span>
            </nav>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D6FF57]">
              <span className="size-2 rounded-full bg-[#D6FF57]" /> Your prep, with a plan
            </p>
            <h1 className="mt-6 max-w-[13ch] font-display text-[clamp(3.25rem,6.5vw,7.5rem)] uppercase leading-[0.9] tracking-[-0.03em] text-white">
              Prepare for <span className="text-[#D6FF57]">what&apos;s next.</span>
            </h1>
            <p className="mt-6 max-w-[56ch] text-[15px] leading-[1.7] text-white/80 lg:text-[17px]">
              The UTME 2026 prep pathway brings live tutoring, recordings, topic practice and timed CBT mocks together in one place. Ask about current availability before you pay.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#callback" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">
                Ask about availability <ArrowRight size={15} />
              </Link>
              <Link href="#programme" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
                Explore the pathway
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-2 border-t border-white/20 pt-6">
              {["One account, any device", "Live + recorded", "Parent progress notes"].map((feature) => (
                <span key={feature} className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/85">{feature}</span>
              ))}
            </div>
          </div>
          <UtmeCallbackForm />
        </div>
      </section>

      <section className="w-full bg-[#D6FF57] py-5 text-[#0F2A1A]">
        <div className="container-x flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]">Built for the exam hall</p>
          <p className="text-[13px] font-semibold">Learn the topic. Practise the format. See your progress.</p>
        </div>
      </section>

      <section id="programme" className="scroll-mt-20 w-full bg-[#F9F6ED] py-16 lg:py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">01 / What&apos;s inside</p>
              <h2 className="mt-3 max-w-[18ch] font-display text-[clamp(2rem,4.5vw,4rem)] uppercase leading-[0.95] text-[#0F2A1A]">Real preparation, every step of the way.</h2>
            </div>
            <p className="max-w-[45ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">Learn online on virtual.ykaycollege.com — the same account on your phone. No separate prep site, and no score or admission guarantee.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {INCLUDED.map((item, index) => (
              <article key={item.title} className="flex min-h-[250px] flex-col rounded-[20px] border border-black/10 bg-white p-6 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"><item.icon size={21} /></span>
                  <span className="font-display text-[20px] text-[#0F2A1A]/65">0{index + 1}</span>
                </div>
                <h3 className="mt-7 font-display text-[19px] uppercase leading-[1.05] text-[#0F2A1A]">{item.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[#0F2A1A]/70">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-24">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">02 / The study rhythm</p>
            <h2 className="mt-3 max-w-[17ch] font-display text-[clamp(2rem,4vw,3.7rem)] uppercase leading-[0.95] text-[#0F2A1A]">A clearer path from practice to progress.</h2>
            <p className="mt-5 max-w-[52ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">Tutors use past-question patterns to plan lessons. Timed mocks help you work on speed and confidence; progress notes help families see what comes next.</p>
            <Link href="/login?next=/lms/practice" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-[#194732]">
              Explore CBT practice <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: BookOpen, label: "Learn", desc: "Tutor-led lessons and recordings." },
              { icon: ClipboardCheck, label: "Practise", desc: "Topic drills and timed CBT mocks." },
              { icon: BarChart3, label: "Improve", desc: "Weekly notes show your next focus." },
            ].map((step, i) => (
              <div key={step.label} className={`flex min-h-[225px] flex-col rounded-[20px] p-5 ${i === 1 ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-[#F9F6ED] text-[#0F2A1A]"}`}>
                <span className="grid size-11 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"><step.icon size={19} /></span>
                <span className="mt-auto font-display text-[23px] uppercase">{step.label}</span>
                <p className="mt-2 text-[12px] leading-relaxed text-[#0F2A1A]/75">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#0F2A1A] py-16 text-white lg:py-24">
        <div className="container-x grid items-start gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6FF57]">03 / Subject support</p>
            <h2 className="mt-3 max-w-[19ch] font-display text-[clamp(2rem,4vw,4rem)] uppercase leading-[0.95] text-white">The subjects you need. The support to keep going.</h2>
            <p className="mt-5 max-w-[48ch] text-[14px] leading-relaxed text-white/75">Build a plan around your combination. For a subject outside this list, request specialist private tuition.</p>
            <Link href="/private-tuition" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-[#D6FF57] hover:underline">Find a private tutor <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUBJECTS.map((subject, index) => (
              <div key={subject} className="flex items-center gap-4 rounded-[20px] border border-white/15 bg-white/5 px-5 py-5 text-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6FF57] font-display text-[13px] text-[#0F2A1A]">0{index + 1}</span>
                <span className="font-semibold">{subject}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SuccessChampions />

      <section className="w-full bg-white py-14 lg:py-20">
        <div className="container-x grid items-center gap-8 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
          <div className="grid size-14 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><Trophy size={24} /></div>
          <div>
            <h2 className="font-display text-[clamp(1.8rem,3vw,3rem)] uppercase text-[#0F2A1A]">Recognition for the work you put in.</h2>
            <p className="mt-3 max-w-[65ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">We celebrate consistent practice and improvement. Prize places are listed only when a round is funded; we do not publish a guaranteed scholarship pool.</p>
          </div>
        </div>
      </section>

      <section id="packages" className="scroll-mt-20 w-full bg-[#F9F6ED] py-16 lg:py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">04 / Find your fit</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.7rem)] uppercase text-[#0F2A1A]">Choose your prep package.</h2>
              <p className="mt-2 max-w-[55ch] text-[14px] text-[#0F2A1A]/70">Indicative 2026 prices. Confirm the current timetable, availability and fee with an advisor before paying.</p>
            </div>
            <Link href="/utme-2026/pricing" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0F2A1A] hover:underline">Full pricing details <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {PACKAGES.map((pkg) => (
              <article key={pkg.name} className={`flex flex-col rounded-[20px] border border-black/10 p-7 lg:p-9 ${pkg.featured ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-white text-[#0F2A1A]"}`}>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0F2A1A]/65">{pkg.featured ? "Most support" : "The essentials"}</p>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <h3 className="font-display text-[clamp(1.8rem,3vw,2.8rem)] uppercase">{pkg.name}</h3>
                  <span className="font-display text-[clamp(2rem,3.2vw,3rem)]">{pkg.price}</span>
                </div>
                <p className="mt-1 text-[12px] text-[#0F2A1A]/65">Indicative · confirm before pay</p>
                <ul className="my-8 grid gap-3 sm:grid-cols-2">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[#0F2A1A]/85"><Check size={16} className="mt-0.5 shrink-0 text-[#0F2A1A]" />{feature}</li>
                  ))}
                </ul>
                <Link href="#callback" className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-[#194732]">Ask about availability <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
          <p className="mt-7 text-center text-[13px] text-[#0F2A1A]/70">Still have questions? <Link href="/utme-2026/faq" className="font-bold text-[#0F2A1A] underline underline-offset-2">Read the UTME FAQs</Link></p>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
