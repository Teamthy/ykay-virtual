import Link from "next/link";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { Tutor } from "../api/search";

// Tutor card (Batch 3) — rebuilt on the requested template: photo on top,
// centered name, SUBJECT TEACHING instead of contact details, a vetted
// badge, and a message CTA. No email/phone is ever shown on cards.

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const subjectLine = (tutor.subjects ?? []).slice(0, 2).map((s) => s.name).join(" · ");

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white pb-4 transition duration-300 hover:-translate-y-1 hover:shadow-card">
      {/* Photo (or branded initial tile) */}
      <div className="relative h-52 w-full overflow-hidden bg-brand-navy">
        {tutor.avatar_url ? (
          <Image
            src={tutor.avatar_url}
            alt={`${tutor.display_name} — NUVORA vetted tutor`}
            width={400}
            height={208}
            className="h-52 w-full object-cover object-top"
          />
        ) : (
          <div className="grid h-52 w-full place-items-center bg-gradient-to-br from-[#060F26] to-brand-navy font-display text-6xl text-white/90">
            {tutor.display_name.slice(0, 1)}
          </div>
        )}

        {/* Vetted badge */}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-brand-green shadow-sm">
          <BadgeCheck size={12} /> Vetted
        </span>
      </div>

      {/* Centered identity block */}
      <div className="flex flex-col items-center px-4 pt-3 text-center">
        <Link
          href={`/tutors/${tutor.slug}`}
          className="font-medium text-ink-900 transition-colors hover:text-brand-blue"
        >
          {tutor.display_name}
        </Link>

        <p className="mt-0.5 text-sm text-ink-500">
          {subjectLine ? `Teaches ${subjectLine}` : "Verified NUVORA tutor"}
        </p>

        <div className="mt-1.5 flex items-center gap-1 text-xs">
          <span className="flex items-center gap-0.5 text-brand-gold">
            <Star size={12} fill="currentColor" strokeWidth={0} />
            <b className="text-ink-800">{tutor.rating_avg.toFixed(1)}</b>
          </span>
          <span className="text-ink-400">({tutor.rating_count})</span>
          {tutor.years_experience ? (
            <span className="text-ink-400">· {tutor.years_experience} yrs</span>
          ) : null}
        </div>

        <Link
          href={`/tutors/${tutor.slug}`}
          className="mt-4 rounded-full border border-ink-200 px-6 py-1.5 text-sm text-ink-600 transition hover:bg-ink-100"
        >
          message
        </Link>
      </div>
    </div>
  );
}
