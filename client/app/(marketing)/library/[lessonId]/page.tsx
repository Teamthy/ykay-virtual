"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, FileText, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getLibraryItem } from "@/features/library/api";
import { formatDuration, formatRecordedDate } from "@/lib/format";
import { TranscriptPanel } from "@/features/lms/components/TranscriptPanel";
import { LessonNotesPanel } from "@/features/learning/LessonNotesPanel";

export default function LibraryLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();

  const item = useQuery({
    queryKey: ["library", "item", lessonId],
    queryFn: () => getLibraryItem(lessonId),
    enabled: !!lessonId,
    staleTime: 60_000,
  });

  if (item.isLoading) {
    return (
      <main className="container-x py-12">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-3 h-4 w-2/3" />
      </main>
    );
  }

  if (item.isError || !item.data) {
    return (
      <main className="container-x py-16 text-center">
        <p className="text-[#0F2A1A]/65">This lesson isn&apos;t available.</p>
        <Link href="/library" className="mt-3 inline-block font-semibold text-[#0F2A1A] hover:underline">
          ← Back to the library
        </Link>
      </main>
    );
  }

  const it = item.data;

  return (
    <main className="container-x py-10">
      <Link href="/library" className="mb-5 inline-block text-sm font-semibold text-[#0F2A1A] hover:underline">
        ← Recorded Lesson Library
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0F2A1A]">
            {it.entitled && it.video_url ? (
              <video
                src={it.video_url}
                controls
                poster={it.thumbnail_url ?? undefined}
                className="aspect-video w-full bg-black"
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0F2A1A] via-[#0F2A1A] to-[#0F2A1A] p-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <Lock className="text-[#0F2A1A]" size={26} />
                </span>
                <h2 className="text-xl font-bold text-white">Enrol to watch this lesson</h2>
                <p className="max-w-md text-sm text-white/70">
                  This recording is part of a cohort. Enrol (or sign in as an enrolled student) to unlock the full
                  video and its transcript.
                </p>
                {it.cohort_id && (
                  <Link
                    href={`/cohorts/${it.cohort_id}/enroll`}
                    className="mt-3 rounded-xl bg-[#D6FF57] px-5 py-2.5 text-sm font-bold text-[#0F2A1A] transition-colors hover:bg-[#C8F030]"
                  >
                    Enrol in this cohort
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold tracking-[0.01em] text-[#0F2A1A]">{it.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#0F2A1A]/65">
              {it.programme_title && <span>{it.programme_title}</span>}
              {it.level_name && <span>{it.level_name}</span>}
              {it.curriculum_name && <span>{it.curriculum_name}</span>}
              {it.duration_seconds ? (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {formatDuration(it.duration_seconds)}
                </span>
              ) : null}
              <span>{formatRecordedDate(it.start_at)}</span>
            </div>
            {it.subjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {it.subjects.map((s) => (
                  <span key={s} className="rounded-full bg-[#F9F6ED] px-2.5 py-1 text-xs font-medium text-[#0F2A1A]/70">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {it.description && <p className="mt-4 text-sm leading-relaxed text-[#0F2A1A]/70">{it.description}</p>}
            {it.entitled && (
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
                <h2 className="mb-3 text-sm font-bold text-[#0F2A1A]">Notes &amp; bookmarks</h2>
                <LessonNotesPanel lessonId={lessonId} />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {it.cohort_title && (
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">Part of</p>
              <Link
                href={it.cohort_id ? `/cohorts/${it.cohort_id}` : "#"}
                className="mt-1 block font-bold text-[#0F2A1A] hover:text-[#0F2A1A]"
              >
                {it.cohort_title}
              </Link>
            </div>
          )}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F2A1A]">
              <FileText size={16} className="text-[#0F2A1A]" /> Lesson notes
            </h3>
            {it.entitled && it.transcript ? (
              <TranscriptPanel text={it.transcript} />
            ) : (
              <p className="mt-3 text-sm text-[#0F2A1A]/65">
                {it.entitled ? "No transcript attached to this lesson yet." : "The transcript unlocks once you're enrolled in this cohort."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
