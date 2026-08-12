import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { UtmeCallbackForm } from "@/features/programmes/components/UtmeCallbackForm";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 Prep — Your Child's Best Chance at 300+ | NUVORA",
  description:
    "Structured UTME 2026 preparation: mock CBT, past papers, remedial support, scholarships and a track record of 345 in the 2025 cohort. Leave your number — our advisors call back.",
  path: "/utme-2026",
});

export default function Utme2026Page() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "UTME 2026 Prep", item: "https://nuvora.com/utme-2026" },
  ]);
  const course = courseJsonLd({
    name: "NUVORA UTME 2026 Preparation Programme",
    description:
      "Structured UTME 2026 preparation with mock CBT, past papers and remedial support. Highest score 345 in the 2025 cohort.",
    provider: "NUVORA",
    url: "https://nuvora.com/utme-2026",
  });

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      <PageHero
        eyebrow="UTME 2026 · JAN–APR"
        title="Your child's best chance at a 300+ score"
        subtitle="Mock CBT every week, 200+ practice tests, past-paper drills, remedial support and a scholarship pool — with a 2025 cohort high of 345."
        crumbs={[{ name: "Home", href: "/" }, { name: "UTME 2026 Prep" }]}
        align="center"
      >
        <a href="#callback" className="btn-gold">Get a callback</a>
        <a href="/cohorts" className="px-8 py-4 rounded-lg border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-colors">
          View cohorts
        </a>
      </PageHero>

      {/* Stats strip */}
      <section className="border-b border-ink-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "345", l: "Highest score — 2025 cohort" },
            { v: "98%", l: "Exam success rate" },
            { v: "200+", l: "Practice tests" },
            { v: "₦20M", l: "Scholarship pool" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-extrabold tracking-tight text-brand-navy">{s.v}</p>
              <p className="mt-1 text-xs font-semibold text-ink-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Phone capture */}
      <section id="callback" className="py-20 bg-surface-muted scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">We&apos;ve got you covered</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy">
              Leave your number — our Learning Advisors call you back
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Tell us about your candidate, their current class and target score. We&apos;ll walk you
              through the programme, match a coach and agree a plan — no obligation.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-600">
              <li className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Same-day callback during office hours</li>
              <li className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Free diagnostic mock before you enrol</li>
              <li className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> Escrow-protected fees until the cohort delivers</li>
            </ul>
          </div>
          <UtmeCallbackForm />
        </div>
      </section>

      <SuccessChampions />

      <StepsToTutor
        title="Get UTME-ready in 3 simple steps"
        steps={[
          { n: "1", title: "Take a free diagnostic", desc: "We assess your child's current level across Maths, English, Physics, Chemistry and Biology." },
          { n: "2", title: "Join a mastery cohort", desc: "Small-group live lessons with a top-1% coach, weekly mock CBT and past-paper drills." },
          { n: "3", title: "Score 300+", desc: "Track progress in the parent portal and walk into the exam hall ready." },
        ]}
      />

      <GuaranteeBand />
    </main>
  );
}
