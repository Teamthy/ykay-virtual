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

      {/* ── Dashboard-style stats strip ─────────────────────────────────── */}
      <div className="container-x -mt-8 pb-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { k: "6", label: "Career-ready tracks" },
            { k: "500+", label: "Learners taught" },
            { k: "1:12", label: "Max tutor:student ratio" },
            { k: "100%", label: "Project-based learning" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-5 text-center shadow-soft">
              <p className="font-display text-3xl text-brand-navy">{s.k}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
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
