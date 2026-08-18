import type { Metadata } from "next";
import { buildMetadata, personJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedContent } from "@/components/RelatedContent";
import { ReviewsSection } from "@/features/reviews/components/ReviewsSection";
import { notFound } from "next/navigation";
import { PrivateBookingForm } from "@/features/tuition/PrivateBookingForm";
import { apiFetchSSR } from "@/lib/server-api";
import Image from "next/image";
import { BadgeCheck, Star, MapPin, Clock, Users, GraduationCap } from "lucide-react";
import { tutorPortraitSrc } from "@/lib/portraits";

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
  avatar_url?: string;
  location?: string;
  subjects?: { name: string; slug: string }[];
  years_experience?: number;
  total_hours_taught?: number;
  total_students?: number;
  verified_at?: string;
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
  const subjectNames = (t.subjects ?? []).map((s) => s.name);
  return buildMetadata({
    title: `${t.display_name}${subjectNames.length ? ` — ${subjectNames.join(", ")} Tutor` : ""} | NUVORA`,
    description: (t.bio ?? t.headline ?? `${t.display_name} teaches on NUVORA.`).slice(0, 155),
    path: `/tutors/${params.slug}`,
  });
}

function fmtRate(t: TutorDTO): string {
  const min = t.hourly_rate_min;
  const max = t.hourly_rate_max;
  const cur = t.currency || "NGN";
  if (min == null && max == null) return "Rate on request";
  if (max && min && max !== min) return `${cur} ${min.toLocaleString()}–${max.toLocaleString()}/hr`;
  const r = min ?? max;
  return `${cur} ${r!.toLocaleString()}/hr`;
}

export default async function TutorPage(props: Props) {
  const params = await props.params;
  const tutor = await fetchTutor(params.slug);
  if (!tutor) return notFound();

  const subjectNames = (tutor.subjects ?? []).map((s) => s.name);
  const verified = !!tutor.verified_at;

  const person = personJsonLd({
    name: tutor.display_name,
    description: tutor.bio ?? tutor.headline ?? "",
    ratingValue: tutor.rating_avg,
    ratingCount: tutor.rating_count,
    url: `https://nuvora.com/tutors/${params.slug}`,
    image: "https://nuvora.com/og-default.jpg",
  });

  return (
    <main className="container-x py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tutors", href: "/tutors" }, { name: tutor.display_name }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Left: identity + booking ── */}
        <div>
          <div className="mb-6 overflow-hidden rounded-3xl bg-brand-navy">
            <Image
              src={tutorPortraitSrc(tutor.slug, (tutor as { avatar_url?: string }).avatar_url)}
              alt={`${tutor.display_name} — NUVORA tutor`}
              width={960}
              height={420}
              className="h-64 w-full object-cover object-top md:h-80"
              priority
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold-light px-3 py-1 text-xs font-bold text-brand-green">
                <BadgeCheck size={14} /> ID Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-ink-600">
                NUVORA tutor
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <Star size={14} fill="currentColor" className="text-brand-gold" strokeWidth={0} />
              {tutor.rating_count > 0 ? `${tutor.rating_avg.toFixed(1)} (${tutor.rating_count} reviews)` : "New tutor"}
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl tracking-[0.02em] text-brand-navy md:text-5xl">{tutor.display_name}</h1>
          {tutor.headline && <p className="mt-2 text-lg font-medium text-ink-800">{tutor.headline}</p>}
          {tutor.bio && <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{tutor.bio}</p>}

          {subjectNames.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {subjectNames.map((name) => (
                <span key={name} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700">
                  {name}
                </span>
              ))}
            </div>
          )}

          <section className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">Child-centred teaching approach</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Adaptive learning plans, child-centred delivery and periodic evaluation — plus NUVORA progress reports
              with strengths, weaknesses and recommendations, all audited.
            </p>
          </section>

          <section id="book" className="mt-8">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">Request private tuition</h2>
            <div className="mt-4">
              <PrivateBookingForm
                tutorProfileId={tutor.id}
                subjects={subjectNames}
                defaultRate={tutor.hourly_rate_min ?? 0}
              />
            </div>
          </section>

          <ReviewsSection tutorSlug={params.slug} tutorId={tutor.id} />
        </div>

        {/* ── Right: at-a-glance (sticky) ── */}
        <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-2xl bg-brand-navy p-6 text-white shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Rate</p>
            <p className="mt-1 font-display text-3xl tracking-[0.02em]">{fmtRate(tutor)}</p>
            <a
              href="#book"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-brand-gold px-5 py-3 text-sm font-bold text-ink-900 transition-transform hover:-translate-y-0.5"
            >
              Request tuition
            </a>
            <a
              href={`/messages?tutor=${encodeURIComponent(tutor.slug)}`}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Message tutor
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <GraduationCap size={18} className="text-brand-navy" />
              <p className="mt-2 text-lg font-bold text-ink-900">{tutor.years_experience ?? "—"} yrs</p>
              <p className="text-xs text-ink-500">Experience</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <Users size={18} className="text-brand-navy" />
              <p className="mt-2 text-lg font-bold text-ink-900">{tutor.total_students ?? "—"}</p>
              <p className="text-xs text-ink-500">Students</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <Clock size={18} className="text-brand-navy" />
              <p className="mt-2 text-lg font-bold text-ink-900">{tutor.total_hours_taught ?? "—"}</p>
              <p className="text-xs text-ink-500">Hours taught</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <MapPin size={18} className="text-brand-navy" />
              <p className="mt-2 truncate text-lg font-bold text-ink-900">{tutor.location ?? "Online"}</p>
              <p className="text-xs text-ink-500">Location</p>
            </div>
          </div>

          <p className="rounded-2xl border border-brand-gold/30 bg-brand-gold-light/40 p-4 text-xs leading-relaxed text-ink-700">
            Escrow protected — you pay into the NUVORA wallet; the tutor is paid after confirmation or a 3-day
            auto-release. No off-platform payment.
          </p>
        </aside>
      </div>

      <RelatedContent subjectSlug={(subjectNames[0] ?? "mathematics").toLowerCase().replace(/\s+/g, "-")} />
    </main>
  );
}

export const revalidate = 3600; // ISR 1h — tutor pages change on reviews
