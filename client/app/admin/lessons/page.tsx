"use client";

import { useQuery } from "@tanstack/react-query";
import { listLessonsToday, type AdminLesson } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

// Admin today's classes + attendance exceptions (working-doc §12).
export default function AdminLessonsPage() {
  const lessons = useQuery({
    queryKey: ["admin", "lessons", "today"],
    queryFn: listLessonsToday,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  const data = lessons.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Today&apos;s classes</h1>
          <p className="text-ink-500 text-sm mt-1">Live overview of scheduled lessons, attendance and meeting links.</p>
        </div>
        <Link href="/admin/vetting" className="text-sm font-semibold text-deep hover:underline">Tutor vetting →</Link>
      </div>

      {lessons.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="No lessons scheduled for today"
          description="Scheduled cohort sessions will appear here with attendance and meeting links."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((l: AdminLesson) => (
            <li key={l.id} className="border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{l.title}</p>
                <p className="text-xs text-ink-500">
                  {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                {l.status === "SCHEDULED" && (
                  <Link href={`/cohorts/${l.cohort_id ?? "list"}`} className="text-xs font-semibold text-deep hover:underline">Cohort →</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border p-5">
        <h2 className="font-bold text-sm">Attendance exceptions</h2>
        <p className="mt-1 text-xs text-ink-500">
          Lessons marked NO_SHOW or with missing attendance appear here as tutors complete their rosters.
        </p>
      </section>
    </div>
  );
}
