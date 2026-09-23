import type { Metadata } from "next";
import { buildMetadata, courseJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { DigitalSkillsGrid } from "@/features/digital-skills/components/DigitalSkillsGrid";

export const metadata: Metadata = buildMetadata({
  title:
    "Digital Skills Academy — CS, Python, AI, Cybersecurity & Office | YK-Virtual",
  description:
    "The YK-Virtual Digital Skills Academy: Computer Science, ICT & digital literacy, Python, AI & machine learning, cybersecurity and Microsoft Office — live cohorts and private tuition with vetted tutors.",
  path: "/digital-skills",
});

export default function DigitalSkillsPage() {
  const course = courseJsonLd({
    name: "YK-Virtual Digital Skills Academy",
    description:
      "Computer Science, ICT & digital literacy, Python, AI & machine learning, cybersecurity and Microsoft Office — live cohorts with vetted tutors.",
    provider: "YK-Virtual",
    url: "https://virtual.ykaycollege.com/digital-skills",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Digital Skills",
      item: "https://virtual.ykaycollege.com/digital-skills",
    },
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

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
        <section className="mt-10 rounded-2xl border border-black/10 bg-[#F9F6ED] px-6 py-8 md:px-10">
          <div className="grid items-start gap-8 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-[#0F2A1A]">
                Built for the way careers actually start
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#0F2A1A]/70">
                Every track here is small-group, project-based and led by a
                vetted tutor. You don&apos;t watch your way through the academy
                — you build things, get feedback in class, and finish with
                something you can show.
              </p>
              <a
                href="#courses"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F2A1A]"
              >
                Choose your track <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul className="space-y-3 text-sm text-[#0F2A1A]/75">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-xs font-bold text-[#0F2A1A]">
                  ✓
                </span>
                Six career-ready tracks — computer science to Microsoft Office
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-xs font-bold text-[#0F2A1A]">
                  ✓
                </span>
                No more than 12 learners per tutor, live sessions included
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-xs font-bold text-[#0F2A1A]">
                  ✓
                </span>
                Every course ends with a portfolio project, not just a test
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-xs font-bold text-[#0F2A1A]">
                  ✓
                </span>
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
            <h2 className="mt-1 font-display text-3xl text-[#0F2A1A]">
              Your course dashboard
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#0F2A1A]/70">
              Every track has its own page with the full curriculum, outcomes
              and pricing. Start anywhere — each one ends with a project you can
              show.
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
