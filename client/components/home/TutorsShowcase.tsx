import Image from "next/image";
import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";
import { apiFetchSSR } from "@/lib/server-api";
import { hideDemo } from "@/lib/content-filter";

import { AnimatedText } from "@/components/ui/animated-text";
type TutorRow = {
  id: string;
  slug: string;
  display_name: string;
  headline?: string;
  rating_avg: number;
  rating_count: number;
  subjects?: { name: string }[];
  avatar_url?: string;
};

export async function TutorsShowcase() {
  let tutors: TutorRow[] = [];
  try {
    const res = await apiFetchSSR<TutorRow[]>(
      "/tutors/search?page=1&page_size=6",
    );
    tutors = hideDemo(res.data ?? []);
  } catch {
    tutors = [];
  }

  if (tutors.length === 0) {
    return (
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1920px] px-4 py-14 text-center sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <AnimatedText
            as="h2"
            className="font-display text-3xl tracking-[0.02em] text-[#0F2A1A]"
            text="Meet our tutors"
          />
          <p className="mt-2 text-[#0F2A1A]/70">
            Approved tutors appear here as they complete vetting.
          </p>
          <Link
            href="/tutors"
            className="mt-5 inline-block text-sm font-semibold text-[#0F2A1A] hover:underline"
          >
            Browse the tutor directory →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-[1920px] px-4 py-14 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-14">
        <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
          <AnimatedText
            as="h2"
            className="font-display text-3xl tracking-[0.02em] text-[#0F2A1A] md:text-4xl"
            text="Meet some of our tutors"
          />
          <p className="mt-1 text-[#0F2A1A]/70">
            One-on-one instruction from vetted independent experts.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-3">
          {tutors.map((t) => {
            const role =
              t.subjects
                ?.map((s) => s.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(" · ") ||
              t.headline ||
              "Tutor";
            return (
              <Link
                key={t.id}
                href={`/tutors/${t.slug}`}
                className="group flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
              >
                {t.avatar_url ? (
                  <Image
                    src={t.avatar_url}
                    alt={t.display_name}
                    width={80}
                    height={80}
                    className="size-20 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid size-20 place-items-center rounded-lg bg-[#F9F6ED] text-lg font-bold text-[#0F2A1A]">
                    {t.display_name.slice(0, 1)}
                  </span>
                )}
                <div className="grow">
                  <h3 className="flex items-center gap-1.5 font-medium text-[#0F2A1A] transition-colors group-hover:text-[#0F2A1A]">
                    {t.display_name}
                    <BadgeCheck
                      size={15}
                      className="text-[#0F2A1A]"
                      aria-label="Verified"
                    />
                  </h3>
                  <p className="mt-1 text-xs uppercase text-[#0F2A1A]/65">{role}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-[#0F2A1A]/85">
                      <Star
                        size={13}
                        className="text-[#0F2A1A]"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      {t.rating_avg ? t.rating_avg.toFixed(1) : "-"}
                    </span>
                    <span className="text-xs text-[#0F2A1A]/65">
                      {t.rating_count ? `${t.rating_count} reviews` : "New"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          <Link
            href="/tutors"
            className="flex flex-col items-start justify-center gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="grid size-20 place-items-center rounded-lg border border-dashed border-black/10 bg-[#F9F6ED] text-3xl">
              →
            </span>
            <div className="grow">
              <h3 className="font-medium text-[#0F2A1A]">Browse all tutors</h3>
              <span className="text-sm font-medium text-[#0F2A1A]">
                See the full directory
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
