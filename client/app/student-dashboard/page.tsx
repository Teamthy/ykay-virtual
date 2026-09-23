"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Clock,
  Play,
  UserRound,
  Trophy,
  Award,
  Flame,
  MessageSquareText,
  ClipboardCheck,
} from "lucide-react";
import { SideCard } from "@/components/dashboard/DashHero";
import { MasteryHeatmap } from "@/features/learning/MasteryHeatmap";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import {
  listMyAssignments,
  listMySubmissions,
  getAttendanceSummary,
} from "@/features/portal/api";
import { getMyLessonProgress } from "@/features/lms/api";
import {
  getGradebook,
  getReviewQueue,
  getLeaderboard,
  submitLessonFeedback,
} from "@/features/dashboard/api";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ResumeRail } from "@/components/dashboard/ResumeRail";
import { WelcomeQuote } from "@/components/dashboard/WelcomeQuote";
import { WeeklyGoal } from "@/components/dashboard/WeeklyGoal";
import {
  GradebookWidget,
  ReviewQueueWidget,
  LeaderboardWidget,
  FeedbackPrompt,
} from "@/components/dashboard/InsightWidgets";
import { listMyCertificates } from "@/features/certificates/api";
import {
  groupByCohort,
  computeStats,
  achievements,
} from "@/lib/learning-stats";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
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
      className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white px-4 py-3.5 transition-colors hover:border-[#D6FF57]/50"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          done ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-[#F9F6ED] text-[#0F2A1A]/65"
        }`}
      >
        {done ? (
          <CheckCircle2 size={18} />
        ) : (
          <span className="size-2.5 rounded-full bg-ink-300" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0F2A1A]">{title}</span>
        <span className="block text-xs text-[#0F2A1A]/65">{hint}</span>
      </span>
      <span
        className={`text-xs font-bold ${done ? "text-[#0F2A1A]" : "text-[#0F2A1A]/65"}`}
      >
        {done ? "Done" : "To do"}
      </span>
    </Link>
  );
}

export default function StudentDashboardPage() {
  const { user, context } = useSession();
  const me = context?.student;

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
  const progress = useQuery({
    queryKey: ["student", "progress"],
    queryFn: () => getMyLessonProgress(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const certificates = useQuery({
    queryKey: ["student", "certificates"],
    queryFn: () => listMyCertificates(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const gradebook = useQuery({
    queryKey: ["dashboard", "gradebook"],
    queryFn: () => getGradebook(me?.id),
    enabled: !!user && !!me?.id,
    staleTime: 60_000,
  });
  const reviewQueue = useQuery({
    queryKey: ["dashboard", "review"],
    queryFn: () => getReviewQueue(me?.id),
    enabled: !!user && !!me?.id,
    staleTime: 60_000,
  });
  const leaderboard = useQuery({
    queryKey: ["dashboard", "leaderboard"],
    queryFn: () => getLeaderboard(me?.id),
    enabled: !!user && !!me?.id,
    staleTime: 60_000,
  });

  const upcoming = (lessons.data ?? [])
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
  const next = upcoming[0];
  const submittedIds = new Set(
    (submissions.data ?? []).map((s) => s.assignment_id),
  );
  const enrolled = (lessons.data ?? []).length > 0;

  // Udemy-style aggregates (pure helpers — unit tested).
  const myCourses = groupByCohort(lessons.data ?? [], progress.data ?? [], {});
  const myStats = computeStats({
    lessons: lessons.data ?? [],
    progressRows: progress.data ?? [],
    attendancePct: attendance.data?.rate ?? null,
    submitted: submittedIds.size,
    assignmentsTotal: (assignments.data ?? []).length,
    submissionScores: (submissions.data ?? [])
      .map((x) => x.score)
      .filter((n): n is number => typeof n === "number"),
    certificates: (certificates.data ?? []).length,
  });
  const myAchievements = achievements(myStats);

  const profileDone = !!(user?.first_name && user?.last_name);
  const checksDone = [profileDone, true, false, enrolled].filter(
    Boolean,
  ).length;

  return (
    <DashboardPage>
      <RoleGate page="/student-dashboard" />

      <WelcomeQuote />
      <ResumeRail
        items={(lessons.data ?? [])
          .filter((l) => l.video_url && l.status !== "CANCELLED")
          .slice(0, 3)
          .map((l) => ({
            id: l.id,
            title: l.title,
            href: "/lms/recorded",
            subtitle: "Recorded lesson",
          }))}
      />

      {me?.is_minor && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D6FF57] bg-[#F9F6ED] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🛡️
            </span>
            <div>
              <p className="font-bold text-[#0F2A1A]">Parent-guided account</p>
              <p className="text-sm text-[#0F2A1A]/70">
                You&apos;re under 15, so a parent or guardian manages bookings
                and payments for you. Your lessons, assignments and progress all
                work right here.
              </p>
            </div>
          </div>
          <Link
            href="/account"
            className="text-sm font-bold text-[#0F2A1A] hover:underline"
          >
            View settings
          </Link>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-[#0F2A1A] p-6 text-white shadow-card md:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-[#D6FF57]/15" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-[#D6FF57] text-[#0F2A1A]">
                  <BookOpen size={20} />
                </div>
                <h2 className="font-display text-2xl tracking-wide md:text-3xl">
                  {me?.is_minor && !enrolled
                    ? `Hi ${me?.first_name ?? "there"} — your parent manages your classes`
                    : me
                      ? enrolled
                        ? `Welcome back, ${me.first_name}`
                        : `Hi ${me.first_name} — find your next class`
                      : enrolled
                        ? "You're enrolled — class starts soon!"
                        : "Find your next class"}
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  {me?.current_level ? `${me.current_level} · ` : ""}
                  {next
                    ? `Next up: ${next.title}.`
                    : "Browse programmes and join a cohort. Your schedule and LMS will appear here."}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <Clock size={18} className="mx-auto text-[#0F2A1A]" />
                <p className="mt-1 text-sm font-bold">
                  {next
                    ? new Date(next.start_at).toLocaleString([], {
                        weekday: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
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
                  <p className="text-sm font-semibold">
                    Watch your instructor&apos;s intro
                  </p>
                  <p className="text-xs text-white/60">
                    A welcome message before the first class
                  </p>
                </div>
              </div>
              {next?.meeting_url || next?.video_url ? (
                <a
                  href={next.meeting_url || next.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-[#0F2A1A] hover:bg-[#D6FF57]"
                >
                  Watch
                </a>
              ) : (
                <Link
                  href="/lms"
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-[#0F2A1A] hover:bg-[#D6FF57]"
                >
                  Open LMS
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0F2A1A]">Before class begins</h3>
                <p className="text-sm text-[#0F2A1A]/65">
                  Get yourself set up and ready
                </p>
              </div>
              <span className="text-sm font-bold text-[#0F2A1A]/65">
                {checksDone}/4
              </span>
            </div>
            <div className="space-y-2">
              <CheckRow
                done={profileDone}
                title="Complete your profile"
                hint="Add your name and a photo"
                href="/account"
              />
              <CheckRow
                done={true}
                title="Enable notifications"
                hint="So you never miss a class or assignment"
                href="/notifications"
              />
              <CheckRow
                done={false}
                title="Join the community"
                hint="Connect with your cohort before class begins"
                href="/messages"
              />
              <CheckRow
                done={enrolled}
                title="Open your first course"
                hint="Materials, live classes and quizzes in the LMS"
                href="/lms"
              />
            </div>
          </section>

          {lessons.isLoading ? (
            <Skeleton className="h-28 w-full rounded-3xl" />
          ) : upcoming.length > 0 ? (
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft">
              <h3 className="font-bold text-[#0F2A1A]">Upcoming classes</h3>
              <ul className="mt-3 divide-y divide-ink-100">
                {upcoming.slice(0, 4).map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0F2A1A]/85">
                        {l.title}
                      </p>
                      <p className="text-xs text-[#0F2A1A]/65">
                        {new Date(l.start_at).toLocaleString([], {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {l.timezone}
                      </p>
                    </div>
                    {l.meeting_url ? (
                      <a
                        href={l.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[#0F2A1A] px-4 py-2 text-xs font-bold text-white"
                      >
                        Join class
                      </a>
                    ) : (
                      <span className="text-xs text-[#0F2A1A]/65">{l.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── My learning (Udemy-style) ─────────────────────────────── */}
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0F2A1A]">My learning</h3>
                <p className="text-sm text-[#0F2A1A]/65">Keep your streak going</p>
              </div>
              <Link
                href="/lms"
                className="text-sm font-bold text-[#0F2A1A] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Course progress"
                value={enrolled ? `${myStats.overallPct}%` : "—"}
                hint={
                  enrolled
                    ? `${myStats.watchedLessons}/${myStats.totalLessons} lessons watched`
                    : "Join a cohort first"
                }
                icon={<Flame size={16} />}
              />
              <StatCard
                label="Attendance"
                value={
                  enrolled && myStats.attendancePct != null
                    ? `${myStats.attendancePct.toFixed(0)}%`
                    : "—"
                }
                hint="live classes"
                icon={<Clock size={16} />}
              />
              <StatCard
                label="Assignments"
                value={
                  enrolled
                    ? `${myStats.submitted}/${myStats.assignmentsTotal}`
                    : "—"
                }
                hint={
                  enrolled && myStats.avgScore != null
                    ? `avg score ${myStats.avgScore}`
                    : enrolled
                      ? "submitted"
                      : "Join a cohort first"
                }
                icon={<CheckCircle2 size={16} />}
              />
              <StatCard
                label="Certificates"
                value={myStats.certificates}
                hint="earned"
                icon={<Trophy size={16} />}
              />
            </div>
          </section>

          {myCourses.length > 0 && (
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft md:p-6">
              <h3 className="font-bold text-[#0F2A1A]">My courses</h3>
              <div className="mt-3 space-y-4">
                {myCourses.map((c) => (
                  <div
                    key={c.cohortId}
                    className="rounded-2xl border border-black/10 p-4 transition-colors hover:border-[#D6FF57]/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#0F2A1A]/85">{c.title}</p>
                        <p className="text-xs text-[#0F2A1A]/65">
                          {c.watched}/{c.total} lessons completed
                        </p>
                      </div>
                      <Link
                        href={
                          c.cohortId && c.cohortId !== "none"
                            ? `/lms/courses/${c.cohortId}`
                            : "/lms"
                        }
                        className="rounded-full bg-[#0F2A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F2A1A]"
                      >
                        {c.pct >= 100
                          ? "Review course"
                          : c.watched > 0
                            ? "Resume"
                            : "Start course"}
                      </Link>
                    </div>
                    <Progress
                      value={c.pct}
                      showValue={false}
                      className="mt-3"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Achievements */}
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft md:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Award size={16} className="text-[#0F2A1A]" />
              <h3 className="font-bold text-[#0F2A1A]">Topic mastery</h3>
            </div>
            <MasteryHeatmap />
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft md:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Award size={16} className="text-[#0F2A1A]" />
              <h3 className="font-bold text-[#0F2A1A]">Achievements</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {myAchievements.map((a) => (
                <span
                  key={a.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    a.earned
                      ? "border-[#D6FF57] bg-[#F9F6ED] text-[#0F2A1A]"
                      : "border-black/10 bg-[#F9F6ED] text-[#0F2A1A]/65"
                  }`}
                >
                  <span aria-hidden="true">{a.icon}</span> {a.label}
                </span>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CalendarWidget lessons={(lessons.data ?? []) as any[]} />
            <WeeklyGoal
              done={(progress.data ?? []).filter((p) => p.watched).length}
              goal={3}
            />
            <GradebookWidget rows={gradebook.data ?? []} />
            <ReviewQueueWidget items={reviewQueue.data ?? []} />
            <LeaderboardWidget rows={leaderboard.data ?? []} />
            <FeedbackPrompt
              onRate={(rating) => {
                const next = (lessons.data ?? []).find(
                  (l) => l.status !== "CANCELLED",
                );
                if (next)
                  void submitLessonFeedback(next.id, rating, undefined, me?.id);
              }}
            />
          </div>
        </div>

        <aside className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <SideCard
            icon={<CircleHelp size={18} />}
            title="Have a question?"
            body="Support is happy to help you get settled in before class begins."
            href="/help"
            link="Contact support →"
            image="/home/card-tutoring.jpg"
          />
          <SideCard
            icon={<ClipboardCheck size={18} />}
            title="CBT Practice"
            body="Search a subject, sit a timed paper, and see your score with explanations."
            href="/lms/practice"
            link="Sit a paper →"
            image="/home/card-cbt.jpg"
          />
          <SideCard
            icon={<MessageSquareText size={18} />}
            title="Messages"
            body="Chat with tutors and classmates about lessons and assignments."
            href="/messages"
            link="Open inbox →"
            image="/home/card-exam.jpg"
          />
          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft sm:col-span-3 xl:col-span-1">
            <div className="mb-3 grid size-10 place-items-center rounded-full bg-[#F9F6ED] text-[#0F2A1A]">
              <UserRound size={18} />
            </div>
            <h3 className="font-bold text-[#0F2A1A]">New to the platform?</h3>
            <p className="mt-1 text-sm text-[#0F2A1A]/65">
              Watch how YK-Virtual lessons, assignments and live classes work.
            </p>
            <Link
              href="/help"
              className="mt-3 inline-block text-sm font-bold text-[#0F2A1A] hover:underline"
            >
              Watch guide →
            </Link>
          </div>
          {me && (
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">
                Your learner profile
              </p>
              <p className="mt-2 font-bold text-[#0F2A1A]">
                {me.first_name} {me.last_name}
              </p>
              <p className="text-sm text-[#0F2A1A]/65">
                {me.current_level || "Level from onboarding"}
              </p>
              <Link
                href="/account"
                className="mt-3 inline-block text-sm font-bold text-[#0F2A1A] hover:underline"
              >
                Edit in settings →
              </Link>
            </div>
          )}
          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">
              Snapshot
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#0F2A1A]/65">Attendance</dt>
                <dd className="font-bold text-[#0F2A1A]">
                  {enrolled && attendance.data
                    ? `${attendance.data.rate.toFixed(0)}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#0F2A1A]/65">Assignments</dt>
                <dd className="font-bold text-[#0F2A1A]">
                  {submittedIds.size}/{assignments.data?.length ?? 0}
                </dd>
              </div>
            </dl>
            <Link
              href="/lms"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#0F2A1A] py-2.5 text-sm font-bold text-white hover:bg-[#0F2A1A]"
            >
              Continue learning
            </Link>
            <Link
              href="/account"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-black/10 py-2.5 text-sm font-bold text-[#0F2A1A]/85"
            >
              Receipts &amp; settings
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
