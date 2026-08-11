"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";

// Student portal — today's lessons, schedule, progress snapshot.
// Lessons come from /me/lessons?student_profile_id= (object-level authz).

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
  cohort_id?: string;
  private_package_id?: string;
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  COMPLETED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-red-100 text-red-700",
  RESCHEDULED: "bg-amber-100 text-amber-700",
  NO_SHOW: "bg-ink-100 text-ink-400",
};

export default function StudentDashboardPage() {
  const { user, isLoading: authLoading } = useSession();

  const lessons = useQuery({
    queryKey: ["student", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/lessons?student_profile_id=00000000-0000-0000-0000-000000000001", {
        headers: { "X-User-ID": user?.id ?? "00000000-0000-0000-0000-0000000000a1", "X-User-Roles": "STUDENT" },
      });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !authLoading,
  });

  const upcoming = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const past = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");

  return (
    <main className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Student dashboard</h1>
      <p className="text-ink-500 text-sm mt-1">
        {user ? `Signed in as ${user.email}` : "Your classes, resources and progress."}
      </p>

      {/* Today strip */}
      <section className="mt-8 rounded-2xl bg-brand-blue text-white p-6">
        <h2 className="font-bold">Today&apos;s lessons</h2>
        {lessons.isLoading ? (
          <Skeleton className="h-14 w-full mt-3 bg-white/20" />
        ) : upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-white/80">No lessons scheduled for today — enjoy the break! 📚</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.slice(0, 4).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                <div>
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-xs text-white/70">
                    {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                  </div>
                </div>
                {l.meeting_url ? (
                  <a href={l.meeting_url} target="_blank" rel="noreferrer"
                    className="rounded-xl bg-white text-brand-blue font-bold text-sm px-5 py-2.5 hover:brightness-95">
                    Join class
                  </a>
                ) : (
                  <span className="text-xs text-white/60">Link opens at lesson time</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Recent lessons */}
        <section className="border rounded-2xl p-6">
          <h2 className="font-bold">Recent lessons</h2>
          {lessons.isLoading ? (
            <Skeleton className="h-16 w-full mt-3" />
          ) : past.length === 0 && upcoming.length === 0 ? (
            <div className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-8 text-center">
              No lessons yet —{" "}
              <Link href="/programmes" className="text-brand-blue font-semibold">join a programme</Link> or{" "}
              <Link href="/private-tuition" className="text-brand-blue font-semibold">request private tuition</Link>.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {past.map((l) => (
                <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{l.title}</div>
                    <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[l.status] ?? "bg-ink-100"}`}>
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Progress snapshot */}
        <aside className="space-y-5">
          <div className="border rounded-2xl p-6">
            <h2 className="font-bold">Progress</h2>
            <div className="mt-4 space-y-4">
              {[
                { label: "Attendance", value: "92%", note: "last 30 days" },
                { label: "Assignments", value: "8/10", note: "submitted on time" },
                { label: "Lessons completed", value: String(past.length), note: "all time" },
              ].map((p) => (
                <div key={p.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-600">{p.label}</span>
                    <span className="font-bold">{p.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink-100">
                    <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: p.label === "Attendance" ? "92%" : p.label === "Assignments" ? "80%" : `${Math.min(100, past.length * 20)}%` }} />
                  </div>
                  <p className="text-[10px] text-ink-400 mt-0.5">{p.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ink-50 border border-ink-100 p-6">
            <h2 className="font-bold">Quick links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/messages" className="text-brand-blue font-semibold hover:underline">Messages with tutors →</Link></li>
              <li><Link href="/notifications" className="text-brand-blue font-semibold hover:underline">Notifications →</Link></li>
              <li><Link href="/blog" className="text-brand-blue font-semibold hover:underline">Study resources & blog →</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
