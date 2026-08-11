import type { Metadata } from "next";
import { buildMetadata, personJsonLd, breadcrumbJsonLd, reviewJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";

type Props = { params: { slug: string } };

// Mock - in prod fetch from /api/v1/tutors/[slug] with SSG+ISR revalidate 3600
const tutors: Record<string, any> = {
  "chinasa": { name: "Chinasa", bio: "M.Ed Mathematics Education UNILAG. Teaches British & Nigerian Syllabus Grades 1-6. 10+ years, 2548 hours, 34 students.", rating: 4.87, count: 28, subjects: ["Mathematics", "English"], verified: true, location: "Lagos" },
  "oluwatobi": { name: "Oluwatobi", bio: "Build student's confidence in Mathematics and Sciences. Common Entrance, Checkpoint, WAEC, NECO, UTME...", rating: 4.6, count: 20, subjects: ["Mathematics", "Physics"], verified: true, location: "Lagos" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = tutors[params.slug];
  if (!t) return buildMetadata({ title: "Tutor Not Found", description: "Tutor not found", path: `/tutors/${params.slug}`, noIndex: true });
  return buildMetadata({
    title: `${t.name} — ${t.subjects.join(", ")} Tutor | YKAY Virtual School`,
    description: t.bio.slice(0, 155),
    path: `/tutors/${params.slug}`,
  });
}

export default function TutorPage({ params }: Props) {
  const tutor = tutors[params.slug];
  if (!tutor) return notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Tutors", item: "https://ykayvirtual.com/tutors" },
    { name: tutor.name, item: `https://ykayvirtual.com/tutors/${params.slug}` },
  ]);

  const person = personJsonLd({
    name: tutor.name,
    description: tutor.bio,
    ratingValue: tutor.rating,
    ratingCount: tutor.count,
    url: `https://ykayvirtual.com/tutors/${params.slug}`,
    image: "https://ykayvirtual.com/og-default.jpg",
  });

  const review = reviewJsonLd({
    itemName: tutor.name,
    ratingValue: tutor.rating,
    author: "Mrs. Soetan",
    reviewBody: "My daughter scored among the highest... now contends with top students.",
  });

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(review) }} />

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide bg-green-50 text-green-700 px-3 py-1 rounded-full">✓ ID Verified • Background Checked</div>
          <h1 className="mt-4 text-4xl font-extrabold">{tutor.name}</h1>
          <p className="mt-2 text-ink-600">{tutor.bio}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="font-bold">{tutor.rating}</span><span className="text-ink-500">({tutor.count} reviews)</span>
            <span className="ml-4 text-sm">📍 {tutor.location}</span>
            <span className="ml-2 text-sm">Subjects: {tutor.subjects.join(", ")}</span>
          </div>

          <section className="mt-8 border rounded-2xl p-6">
            <h3 className="font-bold">Child-Centered Teaching Approach</h3>
            <p className="mt-2 text-sm text-ink-600">Tuteria parity: Adaptive Learning Plans, Child-Centered, Periodic Evaluation. YKAY adds: progress reports with strengths/weaknesses/recommendations, audited.</p>
          </section>

          <section className="mt-8">
            <h3 className="font-bold">Reviews (consent-gated public)</h3>
            <div className="mt-4 border rounded-2xl p-5">
              <p className="text-sm">“My daughter scored among the highest in her common entrance...”</p>
              <div className="mt-2 text-xs text-ink-500">— Mrs. Soetan, Lekki, Lagos • Verified purchase • Consent given</div>
            </div>
          </section>
        </div>

        <div className="border rounded-2xl p-6 h-fit lg:sticky lg:top-28">
          <h3 className="font-bold">Book this tutor</h3>
          <p className="mt-2 text-sm text-ink-600">Escrow protected — you pay to wallet, tutor paid after confirmation or 3-day auto-release. No off-platform payment.</p>
          <button className="mt-5 btn-gold w-full">Request Tuition</button>
          <div className="mt-4 text-xs text-ink-500">Good Fit Guarantee: first hour protected.</div>
        </div>
      </div>
    </main>
  );
}

export const revalidate = 3600; // ISR 1h — tutor pages change on reviews
