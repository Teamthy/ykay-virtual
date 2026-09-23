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
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-bold text-[#0F2A1A]">
        <CalendarDays size={16} className="text-[#0F2A1A]" /> Upcoming
      </h3>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-[#0F2A1A]/65">No upcoming classes yet. Join a cohort to fill your calendar.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((l) => {
            const d = new Date(l.start_at);
            return (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#F9F6ED] text-center">
                  <div>
                    <p className="text-sm font-bold leading-none text-[#0F2A1A]">{d.getDate()}</p>
                    <p className="text-[9px] uppercase text-[#0F2A1A]/65">{d.toLocaleString("en", { month: "short" })}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0F2A1A]/85">{l.title}</p>
                  <p className="flex items-center gap-1 text-xs text-[#0F2A1A]/65">
                    <Clock size={11} /> {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {(l.meeting_url || l.video_url) && (
                  <Link href="/lms" className="text-xs font-bold text-[#0F2A1A] hover:underline">
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
