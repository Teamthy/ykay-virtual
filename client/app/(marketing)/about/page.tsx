import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Eye,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "About — Academic Leadership & Standards | YK-Virtual",
  description:
    "YK-Virtual is an online school: vetted tutors, governed curricula and visible progress. Meet our founder.",
  path: "/about",
});

const FOUNDER = {
  name: "Yinka Oladimeji",
  role: "Founder & Academic Leader",
  summary:
    "Educator, Computing leader and IT professional with a career spanning leading international schools in Nigeria.",
  career: [
    "Atlantic Hall Educational Trust Council",
    "Day Waterman College",
    "Children's International School, Lekki — Head of Computing",
  ],
  credentials: [
    "BSc Computer Science",
    "MSc Information Technology",
    "Fellow, COBIS Middle Leaders",
  ],
  highlights: [
    "IGCSE Computer Science learners with exceptional national outcomes.",
    "Led a delegation at the 2026 International Coding Olympiad (Rome) — medals and a Nigerian student world Top-3 in Codementum.",
  ],
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Academically governed",
    body: "Every tutor vetted; every programme follows a defined curriculum.",
  },
  {
    icon: BookOpen,
    title: "Multi-curriculum",
    body: "British and Nigerian pathways in one platform.",
  },
  {
    icon: Eye,
    title: "Parent visibility",
    body: "Attendance, progress and payments in one dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Safeguarding by design",
    body: "Restricted messaging and careful handling of learner data.",
  },
];

export default function AboutPage() {
  const person = personJsonLd({
    name: FOUNDER.name,
    description: FOUNDER.summary,
    url: "https://virtual.ykaycollege.com/about",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "About", item: "https://virtual.ykaycollege.com/about" },
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }}
      />

      <PageHero
        cover="/hero/about.jpg"
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="An online school, not a tutor directory — vetted tutors, governed curricula and progress you can see."
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        align="center"
      />

      {/* Every band is full bleed; only its content respects the page gutters. */}
      <section className="w-full bg-[#0F2A1A] py-12 text-white lg:py-20">
        <div className="container-x grid items-center gap-6 lg:grid-cols-[0.65fr_1fr] lg:gap-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6FF57]">01 / Our vision</p>
          <div>
            <h2 className="max-w-[18ch] font-display text-[clamp(2rem,4vw,4rem)] uppercase leading-[0.95] text-white">
              Great teaching without borders.
            </h2>
            <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-white/80">
              High-quality, accountable teaching beyond geography — for every learner, wherever they are.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#F9F6ED] py-14 lg:py-20">
        <div className="container-x">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">02 / Our difference</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] uppercase text-[#0F2A1A]">
            A school with a standard.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex flex-col rounded-[20px] border border-black/10 bg-white p-6 shadow-soft">
                <span className="grid size-11 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-7 font-display text-[18px] uppercase text-[#0F2A1A]">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/70">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The founder portrait spans the viewport: no container around the image. */}
      <section aria-labelledby="founder-heading" className="relative isolate min-h-[520px] w-full overflow-hidden bg-[#0F2A1A] lg:min-h-[760px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/founder/ade-yinka-portrait.jpg"
          alt={`${FOUNDER.name}, ${FOUNDER.role}`}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0F2A1A] via-[#0F2A1A]/55 to-transparent lg:bg-gradient-to-r lg:from-[#0F2A1A] lg:via-[#0F2A1A]/90 lg:to-transparent" />
        <div className="container-x relative flex min-h-[520px] items-end py-10 text-white lg:min-h-[760px] lg:items-center lg:py-20">
          <div className="max-w-[520px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6FF57]">03 / Academic leadership</p>
            <h2 id="founder-heading" className="mt-4 font-display text-[clamp(2.5rem,5vw,5rem)] uppercase leading-none text-white">
              {FOUNDER.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#D6FF57]">{FOUNDER.role}</p>
            <p className="mt-5 max-w-[48ch] text-[14px] leading-relaxed text-white/85">{FOUNDER.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {FOUNDER.credentials.map((c) => (
                <span key={c} className="rounded-full border border-white/30 bg-[#0F2A1A]/40 px-3 py-1.5 text-[11px] font-semibold text-white">{c}</span>
              ))}
            </div>
            <ul className="mt-6 space-y-2">
              {FOUNDER.highlights.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/85">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#D6FF57]" />{a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-12 lg:py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">Experience</p>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.6rem)] uppercase text-[#0F2A1A]">Teaching built on experience.</h2>
          </div>
          <div className="flex max-w-[760px] flex-wrap gap-2">
            {FOUNDER.career.map((c) => (
              <span key={c} className="rounded-full border border-black/10 bg-[#F9F6ED] px-4 py-2 text-[12px] font-semibold text-[#0F2A1A]">{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#D6FF57] py-14 lg:py-20">
        <div className="container-x flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">Your next chapter</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] uppercase text-[#0F2A1A]">Start learning with YK-Virtual.</h2>
          </div>
          <Link href="/programmes" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-7 py-3.5 text-[13px] font-bold text-white hover:bg-[#194732]">
            Explore programmes <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
