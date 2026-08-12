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

const cohorts = [
  { title: "IGCSE Computer Science — 2026 Cohort", level: "IGCSE Year 10-11", start: "Jan 2026", fee: "₦35,000", tutor: "Mr. Yinka", seats: "12 left" },
  { title: "JAMB 2026 Mastery — 320+ Score Programme", level: "JAMB", start: "Jan-Apr 2026", fee: "₦35,000", tutor: "Top 1% Team", seats: "Scholarship ₦20M pool" },
  { title: "WAEC Mathematics Intensive", level: "SSS3", start: "Rolling", fee: "₦18,000/mo", tutor: "Mrs. Chinasa", seats: "8 left" },
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
        eyebrow="Live small-group learning"
        title="Online Classes & Cohorts"
        subtitle="Live cohorts, recordings, 200+ practice tests, weekly mock CBT, remedial support, scholarships and leaderboards — for every curriculum."
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
        {cohorts.map((c) => (
          <div key={c.title} className="border rounded-2xl p-6 bg-white shadow-sm">
            <div className="text-xs font-semibold text-brand-blue uppercase tracking-wide">{c.level}</div>
            <h3 className="mt-2 font-bold text-lg leading-tight">{c.title}</h3>
            <div className="mt-3 text-sm text-ink-600">Tutor: {c.tutor} • Start: {c.start}</div>
            <div className="mt-1 text-sm font-semibold">{c.fee} • {c.seats}</div>
            <button className="mt-5 btn-gold w-full">Join Cohort</button>
          </div>
        ))}
      </div>

      <section className="mt-16 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold">How our cohorts beat lead-gen marketplaces</h2>
          <ul className="mt-4 space-y-3 text-ink-700 list-disc pl-5">
            <li>AI-analyzed past questions (15y backlog) → laser curriculum</li>
            <li>100+ live lessons + recordings + unlimited rewatch</li>
            <li>Weekly live CBT mocks simulating real exam pressure</li>
            <li>Remedial office hours + peer community (not WhatsApp spam)</li>
            <li>Weekly progress reports to parents — not just tutor promises</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-ink-100 p-8">
          <h3 className="font-bold">What Tuteria doesn’t have here</h3>
          <p className="mt-2 text-sm text-ink-600">Tuteria Prep is a separate subdomain (tuteriaprep.com) with isolated auth. NUVORA keeps cohorts inside main domain → single SEO authority, unified wallet, same login, related content tutor↔subject↔blog, cancellable with escrow.</p>
        </div>
      </section>
            </div>
      </div>
    </main>
  );
}
