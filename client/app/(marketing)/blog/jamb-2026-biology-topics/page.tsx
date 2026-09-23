import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { jsonLd } from "@/lib/json-ld";
import { PageHero } from "@/components/layout/PageHero";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ListChecks,
  PenLine,
  ShieldAlert,
  Target,
  BookOpenCheck,
} from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title:
    "JAMB 2026 Biology: Highest-Yield Topics & 90-Day Revision Plan | YK-Virtual",
  description:
    "Six high-yield JAMB Biology units with typical weights, why they matter and subtopics to master - plus a structured 90-day revision plan. Pattern analysis, not predictions.",
  path: "/blog/jamb-2026-biology-topics",
});

/** Published 28 July 2026 — preserved from the original post record. */
const PUBLISHED_AT = "2026-07-28T00:00:00Z";
const PUBLISHED_LABEL = "28 July 2026";

type Topic = {
  n: string;
  title: string;
  weight: string;
  why: string;
  subtopics: string[];
};

const TOPICS: Topic[] = [
  {
    n: "01",
    title: "Cell Biology & the Cell as the Unit of Life",
    weight: "typically 10–15% of past-paper questions",
    why: "Everything in Biology builds on the cell. JAMB repeatedly asks for organelle functions, plant-versus-animal cell comparisons and the levels of organisation — direct, factual questions that are easy marks if the basics are solid.",
    subtopics: [
      "Cell organelles and their functions",
      "Plant vs animal cells",
      "Levels of organisation (cell → tissue → organ → system)",
      "Prokaryotic vs eukaryotic cells",
      "Cell theory and the history of cell discovery",
      "Introduction to microscopy",
    ],
  },
  {
    n: "02",
    title: "Genetics & Heredity",
    weight: "typically 10–15% of past-paper questions",
    why: "A dependable source of working questions: monohybrid crosses, blood-group problems and sex-linked inheritance appear in almost every sitting. Master the punnett-square mechanics and these become fast, reliable points.",
    subtopics: [
      "Mendelian inheritance and monohybrid crosses",
      "Dominance, co-dominance and incomplete dominance",
      "Sex linkage and human blood groups",
      "Mutations and their types",
      "Variations (genetic and environmental)",
      "Introduction to human genetics and pedigree charts",
    ],
  },
  {
    n: "03",
    title: "Plant Physiology",
    weight: "typically 10–15% of past-paper questions",
    why: "Process-based units like transport, photosynthesis and respiration produce structured, repeatable questions. Examiners like to test the mechanism, not just the definition — knowing the 'how and why' of each process is what separates marks.",
    subtopics: [
      "Water and mineral transport (xylem, transpiration)",
      "Photosynthesis and its limiting factors",
      "Plant respiration",
      "Mineral nutrition and deficiency symptoms",
      "Plant movements and responses to stimuli",
      "Introduction to plant hormones",
    ],
  },
  {
    n: "04",
    title: "Animal & Human Physiology",
    weight: "typically 15–20% of past-paper questions",
    why: "The single largest working block in the syllabus. The digestive, circulatory, respiratory and excretory systems recur year after year, frequently alongside labelled diagrams — the unit with the highest expected return for the time you invest.",
    subtopics: [
      "Digestion and the alimentary canal",
      "Circulation: the heart, blood and blood vessels",
      "Respiration and gas exchange",
      "Excretion and homeostasis",
      "The nervous system and sense organs",
      "Introduction to hormones and feedback control",
    ],
  },
  {
    n: "05",
    title: "Classification & Biodiversity",
    weight: "typically 10–15% of past-paper questions",
    why: "Heavy on facts but highly predictable: the five kingdoms, key characteristics of major plant and animal groups, and classic examples. A short, well-organised revision sheet on this unit routinely banks easy questions.",
    subtopics: [
      "The five-kingdom classification",
      "Monera, Protista and Fungi",
      "Plant kingdom: bryophytes to angiosperms",
      "Animal kingdom: invertebrates and chordates",
      "Binomial nomenclature and taxonomy",
      "Sources of biodiversity and conservation",
    ],
  },
  {
    n: "06",
    title: "Ecology & the Environment",
    weight: "typically 10–15% of past-paper questions",
    why: "Current-affairs friendly: food chains and webs, biogeochemical cycles and pollution questions appear consistently and can be linked to everyday examples. Also the usual home of the structured 'apply what you know' question.",
    subtopics: [
      "Ecosystems, habitats and niches",
      "Food chains, food webs and ecological pyramids",
      "Biogeochemical cycles (carbon and nitrogen)",
      "Population ecology and limiting factors",
      "Pollution types and control",
      "Conservation and introduction to applied agriculture",
    ],
  },
];

const PLAN = [
  {
    n: "01",
    window: "Days 1–30",
    title: "Foundations",
    points: [
      "Work through one unit per week, in syllabus order",
      "45–60 focused minutes daily: read, note, self-explain",
      "End each unit with a short past-question set as a diagnostic",
      "Start an error log from day one — every missed question goes in",
    ],
  },
  {
    n: "02",
    window: "Days 31–60",
    title: "Deep work & practice",
    points: [
      "Shift time toward the highest-weight units: physiology and genetics",
      "Daily past-question practice with full explanations",
      "One timed CBT-style mock per week (a full subject paper: 40 questions in about 100 minutes)",
      "Re-do every question in the error log after a 48-hour break",
    ],
  },
  {
    n: "03",
    window: "Days 61–90",
    title: "Mocks & corrections",
    points: [
      "A full mock every 3–4 days under exam conditions",
      "Score by topic and spend corrections time on the weakest units",
      "Keep revision light in the final week: error log + high-yield sheets",
      "Sleep and routine matter — the last month is about consistency",
    ],
  },
];

const FAQS = [
  {
    q: "Can you guarantee which topics will appear in the JAMB 2026 Biology exam?",
    a: "No — and be cautious of anyone who says they can. JAMB does not publish an official topic-by-topic weight, and no past-paper analysis can guarantee a question. The weights here are estimates of how often each unit has appeared in recent papers; use them to prioritise, not to predict.",
  },
  {
    q: "How many past papers should I actually sit?",
    a: "Start with the last 5–10 years and finish them completely with explanations. Quality and correction beat raw volume: a fully corrected paper is worth more than three you simply finished.",
  },
  {
    q: "Does a lower weight mean I can skip a unit?",
    a: "No. Even a 10% unit is 4+ questions on a 40-question paper, and foundation units (cell biology, classification) directly support the high-weight ones. The plan keeps every unit covered — just with different amounts of time.",
  },
  {
    q: "How much time do I get per question in the CBT?",
    a: "A standard UTME CBT subject paper is 40 questions in roughly 100 minutes — about 2.5 minutes per question. Always confirm the current format against the official JAMB syllabus and brochure before exam season.",
  },
  {
    q: "I'm starting earlier than 90 days out. How do I adapt the plan?",
    a: "Stretch the three phases proportionally (e.g. 45/45/45) and add an extra full past-paper cycle at the end. The order and rhythm of the phases matter more than the exact dates.",
  },
];

const RELATED = [
  {
    title: "How to build a consistent study routine that actually works",
    blurb: "A parent-friendly routine builder for JSS & SSS learners.",
    href: "/study-skills",
    tag: "Study Skills",
    img: "/home/card-jss.jpg",
  },
  {
    title: "UTME 2026 prep pathway",
    blurb: "Live classes, recordings, topic practice and timed CBT mocks.",
    href: "/utme-2026",
    tag: "UTME 2026",
    img: "/home/card-utme.jpg",
  },
  {
    title: "Examination preparation hub",
    blurb: "Revision cohorts and past-paper practice for WAEC, NECO, JAMB and IGCSE.",
    href: "/exam-prep",
    tag: "Exam Prep",
    img: "/home/card-exam.jpg",
  },
];

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-[15px] leading-[1.8] text-[#0F2A1A]/80">
      {children}
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  icon: Icon,
}: {
  kicker: string;
  title: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <div className="mt-16">
      <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">
        <Icon size={13} aria-hidden="true" /> {kicker}
      </p>
      <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.4rem)] uppercase leading-[0.95] tracking-[-0.02em] text-[#0F2A1A]">
        {title}
      </h2>
    </div>
  );
}

export default function Jamb2026BiologyTopicsPage() {
  const article = articleJsonLd({
    headline: "JAMB 2026 Biology: Most-Predicted Topics",
    description:
      "Six high-yield JAMB Biology units with typical weights, subtopics and a 90-day revision plan. A pattern analysis of past papers — not a prediction of the 2026 paper.",
    datePublished: PUBLISHED_AT,
    author: "YK-Virtual Academic Team",
    url: "https://virtual.ykaycollege.com/blog/jamb-2026-biology-topics",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "Blog", item: "https://virtual.ykaycollege.com/blog" },
    {
      name: "JAMB 2026 Biology: Most-Predicted Topics",
      item: "https://virtual.ykaycollege.com/blog/jamb-2026-biology-topics",
    },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />

      <PageHero
        cover="/home/card-exam.jpg"
        eyebrow="JAMB · Biology · Study Guide"
        title="JAMB 2026 Biology: Most-Predicted Topics"
        subtitle="Six high-yield units, their typical share of past-paper questions, the subtopics to master - and a structured 90-day revision plan to work through them."
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Blog", href: "/blog" },
          { name: "JAMB 2026 Biology" },
        ]}
        align="left"
      />

      <article className="container-x max-w-4xl py-12 lg:py-16">
        {/* ── Meta + honest framing ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-bold text-[#0F2A1A]/65">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" /> Published {PUBLISHED_LABEL}
          </span>
          <span>By the YK-Virtual Academic Team</span>
        </div>

        <div className="mt-6 flex gap-3 rounded-[20px] border border-[#0F2A1A]/15 bg-[#F9F6ED] p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]">
            <ShieldAlert size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">
              How to read this guide
            </p>
            <p className="mt-1 text-[13px] leading-[1.7] text-[#0F2A1A]/70">
              JAMB does not publish an official topic weight, and no one can
              guarantee which questions will appear in 2026. The weights below
              are estimates of how often each unit has featured in recent
              Biology past papers — a prioritisation tool, not a prediction.
              Pair it with the full current syllabus before you commit a plan.
            </p>
          </div>
        </div>

        <Prose>
          <p>
            Biology is one of the most predictable of the JAMB science subjects:
            the same six or seven units return in almost every sitting, in
            roughly the same proportions. That predictability is the opportunity
            — if you know where the examiners tend to spend their questions, you
            can spend your 90 days where the marks actually are.
          </p>
          <p>
            This guide breaks those units down: what each one typically
            contributes, why it keeps appearing, and the subtopics worth
            drilling. At the end you&apos;ll find a 90-day revision plan that
            turns the list into a daily routine, plus the questions parents and
            candidates ask us most.
          </p>
        </Prose>

        {/* ── Six topic analyses ── */}
        <SectionHeading kicker="01 / The analysis" title="Six highest-yield topic groups" icon={Target} />
        <Prose>
          <p>
            Worked together, these six units account for the large majority of
            a typical JAMB Biology paper. Weights are rough ranges from
            recent past papers — expect variation from sitting to sitting.
          </p>
        </Prose>

        <div className="mt-8 space-y-5">
          {TOPICS.map((t) => (
            <section key={t.n} className="rounded-[20px] border border-black/10 bg-white p-6 shadow-soft lg:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#0F2A1A] font-display text-[15px] text-[#D6FF57]">
                    {t.n}
                  </span>
                  <div>
                    <h3 className="font-display text-[18px] uppercase leading-[1.05] text-[#0F2A1A] md:text-[20px]">
                      {t.title}
                    </h3>
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#D6FF57] px-3 py-1 text-[11px] font-extrabold text-[#0F2A1A]">
                      <Target size={11} aria-hidden="true" /> {t.weight}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-[1.7] text-[#0F2A1A]/70">
                <span className="font-extrabold text-[#0F2A1A]">Why it matters: </span>
                {t.why}
              </p>
              <div className="mt-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0F2A1A]/65">
                  Subtopics to master
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {t.subtopics.map((s) => (
                    <li key={s} className="rounded-full border border-black/10 bg-[#F9F6ED] px-3 py-1.5 text-[11px] font-semibold text-[#0F2A1A]/80">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {/* ── 90-day plan ── */}
        <SectionHeading kicker="02 / The plan" title="A 90-day revision plan" icon={CalendarDays} />
        <Prose>
          <p>
            Three phases, each with a clear job. The rhythm that keeps it
            honest: <b>45–60 minutes of study, 30 minutes of past questions,
            10 minutes updating your error log</b> — every day, including the
            lighter ones.
          </p>
        </Prose>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PLAN.map((p) => (
            <div key={p.n} className="flex flex-col rounded-[20px] border border-black/10 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#0F2A1A] font-display text-[13px] text-[#D6FF57]">
                  {p.n}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#D6FF57]">
                  <Clock size={10} aria-hidden="true" /> {p.window}
                </span>
              </div>
              <h3 className="mt-3 font-display text-[17px] uppercase leading-[1.05] text-[#0F2A1A]">{p.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-[12px] leading-snug font-medium text-[#0F2A1A]/75">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#D6FF57]">
                      <ListChecks size={10} className="text-[#0F2A1A]" aria-hidden="true" />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3 rounded-[20px] bg-[#D6FF57] p-5 lg:p-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]">
            <PenLine size={15} aria-hidden="true" />
          </span>
          <p className="text-[13px] font-semibold leading-[1.7] text-[#0F2A1A]">
            The error log is the whole game. A missed question that gets
            re-doed 48 hours later and again the following week is worth more
            than a fresh set of papers. Keep one page per unit and review the
            log before every mock.
          </p>
        </div>

        {/* ── FAQs ── */}
        <SectionHeading kicker="03 / Questions" title="Frequently asked questions" icon={BookOpenCheck} />
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-[20px] border border-black/10 bg-white p-5 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-bold text-[#0F2A1A] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#F9F6ED] text-[#0F2A1A] transition group-open:rotate-45" aria-hidden="true">
                  <Plus size={14} />
                </span>
              </summary>
              <p className="mt-3 text-[13px] leading-[1.7] text-[#0F2A1A]/70">{f.a}</p>
            </details>
          ))}
        </div>

        {/* ── Related guides ── */}
        <SectionHeading kicker="04 / Keep going" title="Related guides" icon={ArrowRight} />
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {RELATED.map((r) => (
            <Link key={r.href} href={r.href} className="group flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative aspect-[16/9] overflow-hidden bg-[#0F2A1A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
                <span className="absolute left-3 top-3 rounded-full bg-[#0F2A1A]/85 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#D6FF57] backdrop-blur-sm">{r.tag}</span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-[13px] font-bold leading-snug text-[#0F2A1A] line-clamp-2">{r.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#0F2A1A]/65 line-clamp-2">{r.blurb}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A] group-hover:gap-2 transition-all">
                  Open <ArrowRight size={11} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </article>

      {/* ── Cohort CTA ── */}
      <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "28px 28px" }} />
        <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-16">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[640px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D6FF57]">Prefer it taught, not just explained?</p>
              <h2 className="mt-3 font-display text-[clamp(1.7rem,3.4vw,2.6rem)] uppercase leading-[0.92] tracking-[-0.02em] text-white">
                Join a live UTME 2026 cohort
              </h2>
              <p className="mt-4 text-[14px] leading-[1.7] text-white/70">
                Live Biology lessons from vetted tutors, recordings you can
                rewatch, weekly timed mocks and parent progress notes — one
                structured run from now to exam day.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/utme-2026" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]">
                See the UTME 2026 pathway <ArrowRight size={14} />
              </Link>
              <Link href="/cohorts" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-[13px] font-bold text-white transition hover:bg-white/10">
                Browse live cohorts
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Tiny plus glyph for the FAQ toggle (lucide import kept local). */
function Plus({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
