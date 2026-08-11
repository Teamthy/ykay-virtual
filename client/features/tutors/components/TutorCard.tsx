import Link from "next/link";
import { Tutor } from "../api/search";

// Tutor card per working-doc §8.8: photo (avatar), verified badge, subjects,
// experience summary, rating, View Profile / Request Tuition.
export function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="border rounded-2xl p-5 bg-white hover:shadow-lift transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-blue-800 text-white text-xl font-extrabold">
          {tutor.display_name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold truncate">{tutor.display_name}</h3>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-bold">
              ✓ Verified
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            ★ {tutor.rating_avg.toFixed(1)} ({tutor.rating_count}) · {tutor.years_experience ?? 0} yrs exp
          </p>
          {tutor.location && <p className="text-xs text-ink-400 mt-0.5">📍 {tutor.location}</p>}
        </div>
      </div>
      {tutor.bio && <p className="mt-3 text-sm text-ink-600 line-clamp-2">{tutor.bio}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.subjects?.slice(0, 5).map((s) => (
          <span key={s.slug} className="text-xs bg-brand-blue-light text-brand-blue px-2 py-0.5 rounded-full">{s.name}</span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/tutors/${tutor.slug}`} className="rounded-xl border border-ink-200 py-2.5 text-center text-sm font-bold text-ink-800 hover:border-brand-blue transition-colors">
          View profile
        </Link>
        <Link href={`/private-tuition?tutor=${tutor.slug}`} className="rounded-xl bg-brand-blue py-2.5 text-center text-sm font-bold text-white hover:bg-brand-blue/90 transition-colors">
          Request tuition
        </Link>
      </div>
    </div>
  );
}
