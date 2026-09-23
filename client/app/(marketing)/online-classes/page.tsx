import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CategoryRail } from "@/components/layout/CategoryRail";
import { CardCarousel } from "@/components/layout/CardCarousel";

export const revalidate = 600; // ISR 10min

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Online Classes & Cohorts - YK-Virtual | Live Small-Group Learning",
    description:
      "Join live, small-group cohorts: IGCSE, WAEC/NECO, JAMB, A-Level, Digital Skills. Structured schemes, vetted tutors, progress reports. What Tuteria Prep does, but on one platform.",
    path: "/online-classes",
  });
}

const tracks = [
  {
    title: "British curriculum live class",
    level: "IGCSE / A-Level",
    href: "/curricula/british",
    note: "Browse live cohorts when a group is open",
    photo: "/hero/british.jpg",
  },
  {
    title: "UTME / JAMB prep",
    level: "UTME 2026",
    href: "/utme-2026",
    note: "Indicative packages - confirm before pay",
    photo: "/hero/utme.jpg",
  },
  {
    title: "WAEC / NECO boards",
    level: "SSS",
    href: "/entrance-exam",
    note: "Past papers, mocks, weekly reports",
    photo: "/hero/nigerian.jpg",
  },
];

export default function OnlineClassesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Online Classes",
      item: "https://virtual.ykaycollege.com/online-classes",
    },
  ]);
  const course = courseJsonLd({
    name: "YK-Virtual Online Classes & Cohorts",
    description:
      "Structured online cohorts for British, Nigerian and Professional exams with live lessons, recordings, practice exams and weekly reports.",
    provider: "YK-Virtual",
    url: "https://virtual.ykaycollege.com/online-classes",
  });

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }}
      />

      <PageHero
        cover="/hero/programmes.jpg"
        eyebrow="Live small-group learning"
        title="Online Classes & Cohorts"
        subtitle="Live small-group classes on virtual.ykaycollege.com - same login on your phone. Open cohorts come from the live catalogue, not a dummy list."
        crumbs={[{ name: "Home", href: "/" }, { name: "Online Classes" }]}
        align="center"
      >
        <Link href="/cohorts" className="btn-gold">
          Browse cohorts
        </Link>
      </PageHero>

      <div className="container-x mt-10 grid items-start gap-8 pb-16 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-28">
          <CategoryRail />
        </aside>
        <div>
          <CardCarousel>
            {tracks.map((c) => (
              <div
                key={c.title}
                data-card
                className="flex min-h-[220px] w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-cover bg-center p-6 text-white shadow-card bg-[#0F2A1A]"
                style={{
                  backgroundImage: `linear-gradient(165deg, rgba(15,42,26,0.82), rgba(15,42,26,0.55)), url(${c.photo})`,
                }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[#D6FF57]">
                  {c.level}
                </div>
                <h3 className="mt-2 font-bold text-lg leading-tight">
                  {c.title}
                </h3>
                <p className="mt-3 text-sm text-white/80">{c.note}</p>
                <Link
                  href={c.href}
                  className="mt-auto pt-5 text-sm font-bold text-[#D6FF57]"
                >
                  Open this track →
                </Link>
              </div>
            ))}
          </CardCarousel>

          <section className="mt-16 grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl font-bold">
                What a live cohort includes
              </h2>
              <ul className="mt-4 space-y-3 text-[#0F2A1A]/75 list-disc pl-5">
                <li>
                  Past-paper patterns used to plan the syllabus (not a secret
                  15-year AI score)
                </li>
                <li>
                  Live lessons plus recordings you can rewatch on your phone
                </li>
                <li>Timed mocks when the cohort timetable includes them</li>
                <li>Remedial office hours and a moderated peer space</li>
                <li>Weekly progress notes to parents</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-[#F9F6ED] p-8">
              <h3 className="font-bold">One site, one login</h3>
              <p className="mt-2 text-sm text-[#0F2A1A]/70">
                Cohorts sit on virtual.ykaycollege.com - same wallet and account
                as private tuition. There is no second prep domain.
              </p>
              <Link
                href="/cohorts"
                className="mt-4 inline-block text-sm font-bold text-[#0F2A1A]"
              >
                Browse live cohorts →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
