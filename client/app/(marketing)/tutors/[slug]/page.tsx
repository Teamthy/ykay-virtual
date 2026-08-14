import type { Metadata } from "next";
import { buildMetadata, personJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedContent } from "@/components/RelatedContent";
import { ReviewsSection } from "@/features/reviews/components/ReviewsSection";
import { notFound } from "next/navigation";
import { PrivateBookingForm } from "@/features/tuition/PrivateBookingForm";
import { apiFetchSSR } from "@/lib/server-api";

type Props = { params: Promise<{ slug: string }> };

// G1 (phase 43): the page fetches the REAL tutor from /api/v1/tutors/{slug}
// (ISR 1h) — no fixture UUIDs or hard-coded tutor content.
type TutorDTO = {
  id: string;
  slug: string;
  display_name: string;
  headline?: string;
  bio?: string;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  currency?: string;
  rating_avg: number;
  rating_count: number;
  location?: string;
  subjects?: string[];
  years_experience?: number;
  total_hours_taught?: number;
  total_students?: number;
};

async function fetchTutor(slug: string): Promise<TutorDTO | null> {
  try {
    const res = await apiFetchSSR<TutorDTO>(`/tutors/${slug}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await fetchTutor(params.slug);
  if (!t) return buildMetadata({ title: "Tutor Not Found", description: "Tutor not found", path: `/tutors/${params.slug}`, noIndex: true });
  const subjectNames = t.subjects ?? [];
  return buildMetadata({
    title: `${t.display_name}${subjectNames.length ? ` — ${subjectNames.join(", ")} Tutor` : ""} | NUVORA`,
    description: (t.bio ?? t.headline ?? `${t.display_name} teaches on NUVORA.`).slice(0, 155),
    path: `/tutors/${params.slug}`,
  });
}

export default async function TutorPage(props: Props) {
  const params = await props.params;
  const tutor = await fetchTutor(params.slug);
  if (!tutor) return notFound();

  const subjectNames = tutor.subjects ?? [];

  const person = personJsonLd({
    name: tutor.display_name,
    description: tutor.bio ?? tutor.headline ?? "",
    ratingValue: tutor.rating_avg,
    ratingCount: tutor.rating_count,
    url: `https://nuvora.com/tutors/${params.slug}`,
    image: "https://nuvora.com/og-default.jpg",
  });

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tutors", href: "/tutors" }, { name: tutor.display_name }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide bg-green-50 text-green-700 px-3 py-1 rounded-full">✓ ID Verified • Background Checked</div>
          <h1 className="mt-4 text-4xl font-extrabold">{tutor.display_name}</h1>
          {tutor.headline && <p className="mt-1 text-lg text-ink-700">{tutor.headline}</p>}
          {tutor.bio && <p className="mt-2 text-ink-600">{tutor.bio}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tutor.rating_count > 0 && (
              <>
                <span className="font-bold">{tutor.rating_avg.toFixed(2)}</span>
                <span className="text-ink-500">({tutor.rating_count} reviews)</span>
              </>
            )}
            {tutor.location && <span className="ml-4 text-sm">📍 {tutor.location}</span>}
            {subjectNames.length > 0 && <span className="ml-2 text-sm">Subjects: {subjectNames.join(", ")}</span>}
          </div>

          <section className="mt-8 border rounded-2xl p-6">
            <h3 className="font-bold">Child-Centered Teaching Approach</h3>
            <p className="mt-2 text-sm text-ink-600">Adaptive learning plans, child-centered delivery and periodic evaluation — plus NUVORA progress reports with strengths, weaknesses and recommendations, all audited.</p>
          </section>

          <div className="mt-10">
            <PrivateBookingForm
              tutorProfileId={tutor.id}
              subjects={subjectNames}
              defaultRate={tutor.hourly_rate_min ?? 5000}
            />
          </div>

          <ReviewsSection tutorSlug={params.slug} tutorId={tutor.id} />
        </div>

        <div className="border rounded-2xl p-6 h-fit lg:sticky lg:top-28">
          <h3 className="font-bold">Book this tutor</h3>
          <p className="mt-2 text-sm text-ink-600">Escrow protected — you pay to wallet, tutor paid after confirmation or 3-day auto-release. No off-platform payment.</p>
          <a href={`/private-tuition?tutor=${params.slug}`} className="mt-5 btn-gold w-full inline-flex items-center justify-center">Request Tuition</a>
          <div className="mt-4 text-xs text-ink-500">Good Fit Guarantee: first hour protected.</div>
        </div>
      </div>
      <RelatedContent subjectSlug={(subjectNames[0] ?? "mathematics").toLowerCase().replace(/\s+/g, "-")} />
    </main>
  );
}

export const revalidate = 3600; // ISR 1h — tutor pages change on reviews
