"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, CheckCircle2, CircleHelp, Clock, Play, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { listMyAssignments, listMySubmissions, getAttendanceSummary } from "@/features/portal/api";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { Skeleton } from "@/components/ui/skeleton";

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  video_url?: string;
  status: string;
  cohort_id?: string;
};

function CheckRow({
  done,
  title,
  hint,
  href,
}: {
  done: boolean;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 transition-colors hover:border-brand-gold/50"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          done ? "bg-brand-gold text-ink-900" : "bg-ink-50 text-ink-400"
        }`}
      >
        {done ? <CheckCircle2 size={18} /> : <span className="size-2.5 rounded-full bg-ink-300" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{hint}</span>
      </span>
      <span className={`text-xs font-bold ${done ? "text-brand-gold-dark" : "text-ink-400"}`}>
        {done ? "Done" : "To do"}
      </span>
    </Link>
  );
}

export default function StudentDashboardPage() {
  const { user } = useSession();

  const lessons = useQuery({
    queryKey: ["student", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/lessons");
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const assignments = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: () => listMyAssignments(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const submissions = useQuery({
    queryKey: ["student", "submissions"],
    queryFn: () => listMySubmissions(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const attendance = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => getAttendanceSummary(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const upcoming = (lessons.data ?? [])
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const next = upcoming[0];
  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));
  const enrolled = (lessons.data ?? []).length > 0;
  const profileDone = !!(user?.first_name && user?.last_name);
  const checksDone = [profileDone, true, false, enrolled].filter(Boolean).length;

  return (
    <DashboardPage>
      <RoleGate page="/student-dashboard" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-deep p-6 text-white shadow-card md:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-gold/15" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand-gold text-ink-900">
                  <BookOpen size={20} />
                </div>
                <h2 className="font-display text-2xl tracking-wide md:text-3xl">
                  {enrolled ? "You're enrolled — class starts soon!" : "Find your next class"}
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  {next
                    ? `Next up: ${next.title}. While you wait, get your profile ready and connect with your cohort.`
                    : "Browse programmes and join a cohort. Your schedule and LMS will appear here."}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <Clock size={18} className="mx-auto text-brand-gold" />
                <p className="mt-1 text-sm font-bold">
                  {next
                    ? new Date(next.start_at).toLocaleString([], { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Starting soon"}
                </p>
                <p className="text-[11px] text-white/60">Class starts</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-white/15">
                  <Play size={14} />
                </span>
                <div>
                  <p className="text-sm font-semibold">Watch your instructor&apos;s intro</p>
                  <p className="text-xs text-white/60">A welcome message before the first class</p>
                </div>
              </div>
              {next?.meeting_url || next?.video_url ? (
                <a
                  href={next.meeting_url || next.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-deep hover:bg-brand-gold"
                >
                  Watch
                </a>
              ) : (
                <Link
                  href="/lms"
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-deep hover:bg-brand-gold"
                >
                  Open LMS
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink-900">Before class begins</h3>
                <p className="text-sm text-ink-500">Get yourself set up and ready</p>
              </div>
              <span className="text-sm font-bold text-ink-400">{checksDone}/4</span>
            </div>
            <div className="space-y-2">
              <CheckRow done={profileDone} title="Complete your profile" hint="Add your name and a photo" href="/account" />
              <CheckRow done={true} title="Enable notifications" hint="So you never miss a class or assignment" href="/notifications" />
              <CheckRow done={false} title="Join the community" hint="Connect with your cohort before class begins" href="/messages" />
              <CheckRow done={enrolled} title="Open your first course" hint="Materials, live classes and quizzes in the LMS" href="/lms" />
            </div>
          </section>

          {lessons.isLoading ? (
            <Skeleton className="h-28 w-full rounded-3xl" />
          ) : upcoming.length > 0 ? (
            <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="font-bold text-ink-900">Upcoming classes</h3>
              <ul className="mt-3 divide-y divide-ink-100">
                {upcoming.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink-800">{l.title}</p>
                      <p className="text-xs text-ink-500">
                        {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                      </p>
                    </div>
                    {l.meeting_url ? (
                      <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-full bg-deep px-4 py-2 text-xs font-bold text-white">
                        Join class
                      </a>
                    ) : (
                      <span className="text-xs text-ink-400">{l.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="mb-3 grid size-10 place-items-center rounded-full bg-brand-gold-light text-deep">
              <CircleHelp size={18} />
            </div>
            <h3 className="font-bold text-ink-900">Have a question?</h3>
            <p className="mt-1 text-sm text-ink-500">Support is happy to help you get settled in before class begins.</p>
            <Link href="/help" className="mt-3 inline-block text-sm font-bold text-brand-gold-dark hover:underline">
              Contact support →
            </Link>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="mb-3 grid size-10 place-items-center rounded-full bg-peach text-deep">
              <UserRound size={18} />
            </div>
            <h3 className="font-bold text-ink-900">New to the platform?</h3>
            <p className="mt-1 text-sm text-ink-500">Watch how NUVORA lessons, assignments and live classes work.</p>
            <Link href="/help" className="mt-3 inline-block text-sm font-bold text-deep hover:underline">
              Watch guide →
            </Link>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Snapshot</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Attendance</dt>
                <dd className="font-bold text-ink-900">{attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Assignments</dt>
                <dd className="font-bold text-ink-900">
                  {submittedIds.size}/{assignments.data?.length ?? 0}
                </dd>
              </div>
            </dl>
            <Link href="/lms" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-deep py-2.5 text-sm font-bold text-white hover:bg-deep-light">
              Continue learning
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <RecommendationsForYou />
      </div>
    </DashboardPage>
  );
}
