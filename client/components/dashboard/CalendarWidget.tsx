"use client";

import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  status?: string;
  meeting_url?: string;
  video_url?: string;
};

/** Upcoming-classes / deadlines calendar widget (industry-standard). */
export function CalendarWidget({ lessons }: { lessons: Lesson[] }) {
  const upcoming = (lessons ?? [])
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 6);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <CalendarDays size={16} className="text-primary" /> Upcoming
      </h3>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">No upcoming classes yet. Join a cohort to fill your calendar.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((l) => {
            const d = new Date(l.start_at);
            return (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-50 text-center">
                  <div>
                    <p className="text-sm font-bold leading-none text-ink-900">{d.getDate()}</p>
                    <p className="text-[9px] uppercase text-ink-400">{d.toLocaleString("en", { month: "short" })}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800">{l.title}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-500">
                    <Clock size={11} /> {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {(l.meeting_url || l.video_url) && (
                  <Link href="/lms" className="text-xs font-bold text-brand-blue hover:underline">
                    Join
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
