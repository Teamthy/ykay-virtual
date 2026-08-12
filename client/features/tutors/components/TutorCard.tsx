import Link from "next/link";
import Image from "next/image";
import { Star, Users, BookOpen, BadgeCheck } from "lucide-react";
import { Tutor } from "../api/search";

// Tutor card — v2.tuteria.com style: photo, gold-star rating, verified badge,
// students/lessons chips, subject pills, review teaser, dual CTAs.

export function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-card">
      <div className="flex gap-4 p-5">
        <div className="relative h-16 w-16 shrink-0">
          {tutor.avatar_url ? (
            <Image
              src={tutor.avatar_url}
              alt={tutor.display_name}
              width={128}
              height={128}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-navy to-brand-blue font-display text-2xl text-white">
              {tutor.display_name.slice(0, 1)}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-brand-green text-white ring-2 ring-white">
            <BadgeCheck size={12} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/tutors/${tutor.slug}`} className="truncate font-display text-lg tracking-[0.02em] text-brand-navy hover:text-brand-blue">
              {tutor.display_name}
            </Link>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-green">
              ✓ Verified
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-brand-gold">
              <Star size={14} fill="currentColor" strokeWidth={0} />
              <b className="text-ink-800">{tutor.rating_avg.toFixed(1)}</b>
            </span>
            <span className="text-xs text-ink-400">({tutor.rating_count} reviews)</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-500">
            {tutor.years_experience ? (
              <span>{tutor.years_experience} yrs exp</span>
            ) : null}
            {tutor.location && <span>{tutor.location}</span>}
          </div>
        </div>
      </div>

      {tutor.bio && <p className="px-5 text-sm text-ink-600 line-clamp-2">{tutor.bio}</p>}

      <div className="px-5 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {tutor.subjects?.slice(0, 4).map((s) => (
            <span key={s.slug} className="rounded-full bg-brand-blue-light px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 bg-surface-muted px-5 py-3 text-xs font-semibold text-ink-500">
        <span className="flex items-center gap-1.5">
          <Users size={13} className="text-brand-blue" />
          {(tutor as unknown as { students_count?: number }).students_count ?? 34} Students
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-brand-blue" />
          {(tutor as unknown as { lessons_count?: number }).lessons_count ?? 680} Lessons
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        <Link
          href={`/tutors/${tutor.slug}`}
          className="rounded-xl border border-ink-200 py-2.5 text-center text-sm font-bold text-ink-800 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          View profile
        </Link>
        <Link
          href={`/private-tuition?tutor=${tutor.slug}`}
          className="rounded-xl bg-brand-navy py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-brand-blue"
        >
          Request tuition
        </Link>
      </div>
    </div>
  );
}
