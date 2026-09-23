import Link from "next/link";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { Tutor } from "../api/search";

const PORTRAITS = [
  "chinasa",
  "olanike",
  "oluwatobi",
  "adewale",
  "judith",
  "demilola",
] as const;

function portraitSrc(tutor: Tutor): string {
  if (tutor.avatar_url) return tutor.avatar_url;
  if ((PORTRAITS as readonly string[]).includes(tutor.slug))
    return `/tutors/${tutor.slug}.jpg`;
  let h = 0;
  for (let i = 0; i < tutor.slug.length; i++)
    h = (h + tutor.slug.charCodeAt(i)) % PORTRAITS.length;
  return `/tutors/${PORTRAITS[h]}.jpg`;
}

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const subjectLine = (tutor.subjects ?? [])
    .slice(0, 2)
    .map((s) => s.name)
    .join(" · ");
  const photo = portraitSrc(tutor);

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 transition hover:border-[#D6FF57] hover:shadow-soft">
      <Link href={`/tutors/${tutor.slug}`} className="relative shrink-0">
        <Image
          src={photo}
          alt={`${tutor.display_name} — YK-Virtual tutor`}
          width={56}
          height={56}
          className="size-14 rounded-full object-cover object-top ring-2 ring-black/10"
        />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-white text-[#0F2A1A] shadow-sm">
          <BadgeCheck size={13} />
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/tutors/${tutor.slug}`}
          className="truncate font-semibold text-[#0F2A1A] hover:text-[#0F2A1A]"
        >
          {tutor.display_name}
        </Link>
        <p className="truncate text-xs text-[#0F2A1A]/65">
          {subjectLine ? `Teaches ${subjectLine}` : "Verified YK-Virtual tutor"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#0F2A1A]/65">
          <Star
            size={11}
            className="text-[#0F2A1A]"
            fill="currentColor"
            strokeWidth={0}
          />
          <b className="text-[#0F2A1A]/85">{tutor.rating_avg.toFixed(1)}</b>
          <span>({tutor.rating_count})</span>
          {tutor.years_experience ? (
            <span>· {tutor.years_experience} yrs</span>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Link
          href={`/tutors/${tutor.slug}`}
          className="rounded-full bg-[#0F2A1A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0F2A1A]"
        >
          View
        </Link>
        <Link
          href={`/messages?tutor=${tutor.id}`}
          className="text-[11px] font-semibold text-[#0F2A1A]/65 hover:text-[#0F2A1A]"
        >
          Message
        </Link>
      </div>
    </article>
  );
}
