"use client";

import { useQuery } from "@tanstack/react-query";
import { Play, Video, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { listRecordedLessons } from "@/features/lms/recorded";
import { listLearners } from "@/features/onboarding/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { useSession } from "@/hooks/useSession";

export default function RecordedLibraryPage() {
  const { context } = useSession();
  const learners = useQuery({ queryKey: ["onboarding", "learners"], queryFn: listLearners, staleTime: 30_000 });
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    if (studentId) return;
    const own = context?.student?.id;
    const first = (learners.data ?? [])[0]?.id;
    if (own) setStudentId(own);
    else if (first) setStudentId(first);
  }, [context, learners.data, studentId]);

  const lessons = useQuery({
    queryKey: ["me", "recorded", studentId],
    queryFn: () => listRecordedLessons(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const rows = lessons.data ?? [];
  const pickerOptions = [
    ...(context?.student ? [context.student] : []),
    ...(learners.data ?? []).filter((l) => l.id !== context?.student?.id),
  ];

  return (
    <DashboardPage className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
          <Video className="text-brand-gold" /> Recorded lessons
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Rewatch your recorded classes any time. Only lessons from cohorts you&apos;re enrolled in appear here.
        </p>
      </div>

      {pickerOptions.length > 1 && (
        <label className="block max-w-sm text-sm">
          <span className="font-medium text-ink-700">Learner</span>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-gold/30"
          >
            {pickerOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!studentId ? (
        <EmptyState
          icon={<Play size={20} />}
          title="No learner on this account"
          description="Recorded lessons show for your own student profile or a linked learner."
        />
      ) : lessons.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Video size={20} />}
          title="No recorded lessons yet"
          description="Recorded classes from your enrolled cohorts will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((l) => (
            <div key={l.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink-900">{l.title}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                    <Clock size={12} />
                    {new Date(l.start_at).toLocaleDateString()} · {l.timezone}
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gold/20 text-brand-gold">
                  <Play size={18} />
                </span>
              </div>
              {l.video_url ? (
                <a
                  href={l.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-gold px-5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
                >
                  Watch recording
                </a>
              ) : (
                <p className="mt-4 text-xs text-ink-400">Recording not yet available.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
