import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CategoryRail } from "@/components/layout/CategoryRail";

export const revalidate = 600; // ISR 10min

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Online Classes & Cohorts — NUVORA | Live Small-Group Learning",
    description: "Join live, small-group cohorts: IGCSE, WAEC/NECO, JAMB, A-Level, Digital Skills. Structured schemes, vetted tutors, progress reports. What Tuteria Prep does, but on one platform.",
    path: "/online-classes",
  });
}

const tracks = [
  { title: "British curriculum live class", level: "IGCSE / A-Level", href: "/curricula/british", note: "Browse live cohorts when a group is open", photo: "/hero/british.jpg" },
  { title: "UTME / JAMB prep", level: "UTME 2026", href: "/utme-2026", note: "Indicative packages — confirm before pay", photo: "/hero/utme.jpg" },
  { title: "WAEC / NECO boards", level: "SSS", href: "/entrance-exam", note: "Past papers, mocks, weekly reports", photo: "/hero/nigerian.jpg" },
];

export default function OnlineClassesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Online Classes", item: "https://nuvora.com/online-classes" },
  ]);
  const course = courseJsonLd({
    name: "NUVORA Online Classes & Cohorts",
    description: "Structured online cohorts for British, Nigerian and Professional exams with live lessons, recordings, practice exams and weekly reports.",
    provider: "NUVORA",
    url: "https://nuvora.com/online-classes",
  });

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      <PageHero
        cover="/hero/programmes.jpg"
        eyebrow="Live small-group learning"
        title="Online Classes & Cohorts"
        subtitle="Live small-group classes on nuvora.com — same login on your phone. Open cohorts come from the live catalogue, not a dummy list."
        crumbs={[{ name: "Home", href: "/" }, { name: "Online Classes" }]}
        align="center"
      >
        <Link href="/cohorts" className="btn-gold">Browse cohorts</Link>
      </PageHero>

      <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        <aside className="lg:sticky lg:top-28">
          <CategoryRail />
        </aside>
        <div>

      <div className="grid md:grid-cols-3 gap-6">
        {tracks.map((c) => (
          <div
            key={c.title}
            className="flex min-h-[220px] flex-col rounded-2xl bg-cover bg-center p-6 text-white shadow-card"
            style={{
              backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.82), rgba(1,57,32,0.55)), url(${c.photo})`,
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-gold">{c.level}</div>
            <h3 className="mt-2 font-bold text-lg leading-tight">{c.title}</h3>
            <p className="mt-3 text-sm text-white/80">{c.note}</p>
            <Link href={c.href} className="mt-auto pt-5 text-sm font-bold text-brand-gold">Open this track →</Link>
          </div>
        ))}
      </div>

      <section className="mt-16 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold">What a live cohort includes</h2>
          <ul className="mt-4 space-y-3 text-ink-700 list-disc pl-5">
            <li>Past-paper patterns used to plan the syllabus (not a secret 15-year AI score)</li>
            <li>Live lessons plus recordings you can rewatch on your phone</li>
            <li>Timed mocks when the cohort timetable includes them</li>
            <li>Remedial office hours and a moderated peer space</li>
            <li>Weekly progress notes to parents</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-ink-100 p-8">
          <h3 className="font-bold">One site, one login</h3>
          <p className="mt-2 text-sm text-ink-600">Cohorts sit on nuvora.com — same wallet and account as private tuition. There is no second prep domain.</p>
          <Link href="/cohorts" className="mt-4 inline-block text-sm font-bold text-brand-navy">Browse live cohorts →</Link>
        </div>
      </section>
            </div>
      </div>
    </main>
  );
}
