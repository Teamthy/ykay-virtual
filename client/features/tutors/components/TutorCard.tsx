import Link from "next/link";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { Tutor } from "../api/search";
import { tutorPortraitSrc } from "@/lib/portraits";

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const subjectLine = (tutor.subjects ?? []).slice(0, 2).map((s) => s.name).join(" · ");
  const photo = tutorPortraitSrc(tutor.slug, tutor.avatar_url);

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft">
      <div className="relative h-36 w-full overflow-hidden bg-brand-navy">
        <Image
          src={photo}
          alt={`${tutor.display_name} — NUVORA tutor`}
          width={320}
          height={144}
          className="h-36 w-full object-cover object-top"
        />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-brand-green shadow-sm">
          <BadgeCheck size={11} /> Vetted
        </span>
      </div>
      <div className="flex flex-col items-center px-3 py-3 text-center">
        <Link href={`/tutors/${tutor.slug}`} className="text-sm font-semibold text-ink-900 hover:text-brand-blue">
          {tutor.display_name}
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">
          {subjectLine ? `Teaches ${subjectLine}` : "Verified NUVORA tutor"}
        </p>
        <div className="mt-1 flex items-center gap-1 text-[11px]">
          <Star size={11} fill="currentColor" className="text-brand-gold" strokeWidth={0} />
          <b className="text-ink-800">{tutor.rating_avg.toFixed(1)}</b>
          <span className="text-ink-400">({tutor.rating_count})</span>
        </div>
        <div className="mt-3 flex w-full gap-2">
          <Link
            href={`/tutors/${tutor.slug}`}
            className="flex-1 rounded-full border border-ink-200 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Profile
          </Link>
          <Link
            href={`/messages?tutor=${encodeURIComponent(tutor.slug)}`}
            className="flex-1 rounded-full bg-brand-navy py-1.5 text-xs font-semibold text-white hover:bg-brand-blue"
          >
            Message
          </Link>
        </div>
      </div>
    </div>
  );
}
