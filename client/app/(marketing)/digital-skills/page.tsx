import type { Metadata } from "next";
import { buildMetadata, courseJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { DigitalSkillsGrid } from "@/features/digital-skills/components/DigitalSkillsGrid";

export const metadata: Metadata = buildMetadata({
  title: "Digital Skills Academy — CS, Python, AI, Cybersecurity & Office | NUVORA",
  description:
    "The NUVORA Digital Skills Academy: Computer Science, ICT & digital literacy, Python, AI & machine learning, cybersecurity and Microsoft Office — live cohorts and private tuition with vetted tutors.",
  path: "/digital-skills",
});

export default function DigitalSkillsPage() {
  const course = courseJsonLd({
    name: "NUVORA Digital Skills Academy",
    description:
      "Computer Science, ICT & digital literacy, Python, AI & machine learning, cybersecurity and Microsoft Office — live cohorts with vetted tutors.",
    provider: "NUVORA",
    url: "https://nuvora.com/digital-skills",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Digital Skills", item: "https://nuvora.com/digital-skills" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <PageHero
        cover="/hero/digital.jpg"
        eyebrow="The digital academy"
        title="Digital Skills Academy"
        subtitle="Six structured tracks — from your first spreadsheet to shipping an AI project. Live cohorts, vetted tutors, certificates on completion."
        crumbs={[{ name: "Home", href: "/" }, { name: "Digital Skills" }]}
        ctas={[
          { label: "Explore the courses", href: "#courses", primary: true },
          { label: "Book a coding tutor", href: "/private-tuition" },
        ]}
      />

      {/* ── Why the academy works (narrative, not a stats strip) ───────── */}
      <div className="container-x pb-4">
        <section className="mt-10 rounded-2xl border border-ink-100 bg-surface-muted px-6 py-8 md:px-10">
          <div className="grid items-start gap-8 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-brand-navy">Built for the way careers actually start</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600">
                Every track here is small-group, project-based and led by a vetted tutor.
                You don&apos;t watch your way through the academy — you build things,
                get feedback in class, and finish with something you can show.
              </p>
              <a href="#courses" className="mt-5 inline-flex items-center gap-2 rounded-full bg-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-deep-light">
                Choose your track <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul className="space-y-3 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-ink-900">✓</span>
                Six career-ready tracks — computer science to Microsoft Office
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-ink-900">✓</span>
                No more than 12 learners per tutor, live sessions included
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-ink-900">✓</span>
                Every course ends with a portfolio project, not just a test
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-ink-900">✓</span>
                Certificate on completion, escrow-protected payment
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* ── Course dashboard ────────────────────────────────────────────── */}
      <div className="container-x pb-20 pt-8" id="courses">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tag-handwritten">Pick a track</p>
            <h2 className="mt-1 font-display text-3xl text-brand-navy">Your course dashboard</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-600">
              Every track has its own page with the full curriculum, outcomes and pricing.
              Start anywhere — each one ends with a project you can show.
            </p>
          </div>
          <a href="/private-tuition" className="btn-secondary text-sm">
            Prefer 1-on-1? Book a tutor
          </a>
        </div>
        <DigitalSkillsGrid />
      </div>
    </main>
  );
}
