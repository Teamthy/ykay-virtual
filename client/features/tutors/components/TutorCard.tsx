import Link from "next/link";
import { Tutor } from "../api/search";

export function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <Link href={`/tutors/${tutor.slug}`} className="border rounded-2xl p-5 bg-white hover:shadow-lift transition-shadow block">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{tutor.display_name}</h3>
        <span className="text-xs bg-ink-100 px-2 py-1 rounded-full">{tutor.rating_avg} ★ ({tutor.rating_count})</span>
      </div>
      <p className="mt-2 text-sm text-ink-600 line-clamp-2">{tutor.bio || "Vetted tutor — top 1%, ID verified, background checked."}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.subjects?.map(s => <span key={s.slug} className="text-xs bg-brand-blue-light text-brand-blue px-2 py-1 rounded-full">{s.name}</span>)}
      </div>
    </Link>
  );
}
