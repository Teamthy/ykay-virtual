"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  listMyAssignments,
  listMySubmissions,
  submitAssignment,
  getAttendanceSummary,
} from "@/features/portal/api";
import { StudentQuizzes } from "@/features/learning/StudentQuizzes";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart, FileText, CheckCircle2 } from "lucide-react";

// Student portal (working-doc Â§9): side nav, Today panel, progress,
// assignments with submission, resources, announcements, support.

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

type Cohort = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

const SECTIONS = ["Overview", "My Classes", "Calendar", "Assignments", "Quizzes", "Progress"] as const;
type Section = (typeof SECTIONS)[number];

export default function StudentDashboardPage() {
  const qc = useQueryClient();
  // G1: the learner profile resolves from the session server-side.
  const { user } = useSession();
  const [section, setSection] = useState<Section>("Overview");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  const submit = useMutation({
    mutationFn: ({ assignmentId, content }: { assignmentId: string; content: string }) =>
      submitAssignment(undefined, assignmentId, content),
    onSuccess: () => {
      toast.success("Assignment submitted!");
      qc.invalidateQueries({ queryKey: ["student", "assignments"] });
      qc.invalidateQueries({ queryKey: ["student", "submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  const upcoming = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const past = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");
  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));

  return (
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/student-dashboard" />
      <RecommendationsForYou />
      <PageHeader eyebrow="Student" title="Home" cover="/hero/exam-prep.jpg" />

      <div className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              section === s ? "bg-brand-gold text-ink-900" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div>
          {section === "Overview" && (
            <div className="space-y-6">
              {/* KPI snapshot */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Attendance" value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "â€“"} hint={`${attendance.data?.present ?? 0} present of ${attendance.data?.total ?? 0}`} icon={<LineChart size={18} />} />
                <StatCard label="Assignments" value={`${submittedIds.size}/${assignments.data?.length ?? 0}`} hint="submitted" icon={<FileText size={18} />} />
                <StatCard label="Done" value={past.length} hint="lessons" icon={<CheckCircle2 size={18} />} />
              </div>

              {/* Today */}
              <section className="rounded-2xl bg-brand-blue text-white p-6">
                <h2 className="font-bold text-white">Today</h2>
                {lessons.isLoading ? (
                  <Skeleton className="h-12 w-full mt-3 bg-white/20" />
                ) : upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-white/80">No lessons scheduled for today.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {upcoming.slice(0, 4).map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                        <div>
                          <div className="font-semibold">{l.title}</div>
                          <div className="text-xs text-white/70">
                            {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} Â· {l.timezone}
                          </div>
                        </div>
                        {l.meeting_url ? (
                          <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-brand-blue font-bold text-sm px-5 py-2.5">
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

              {/* Recent tutor feedback / notes */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold">Recent</h2>
                {past.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No completed lessons yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-ink-100">
                    {past.slice(0, 5).map((l) => (
                      <li key={l.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold">{l.title}</div>
                          <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ink-100 text-ink-500">{l.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {section === "My Classes" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Classes</h2>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-8 text-center">
                  No lessons yet â€” join a cohort to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(lessons.data ?? []).slice(0, 20).map((l) => (
                    <li key={l.id} className="border rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} Â· {l.timezone}
                        </div>
                      </div>
                      {l.meeting_url ? (
                        <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue text-white text-sm font-bold px-4 py-2">Join</a>
                      ) : (
                        <span className="text-xs text-ink-400">{l.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {section === "Calendar" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Calendar</h2>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">Nothing scheduled yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {groupByDate(lessons.data ?? []).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="text-sm font-bold text-brand-blue">{date}</h3>
                      <ul className="mt-2 space-y-2">
                        {items.map((l) => (
                          <li key={l.id} className="border rounded-xl px-4 py-3 text-sm flex justify-between">
                            <span className="font-semibold">{l.title}</span>
                            <span className="text-xs text-ink-500">{new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} Â· {l.timezone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "Assignments" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Assignments</h2>
              {assignments.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (assignments.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No assignments yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {assignments.data?.map((a) => {
                    const done = submittedIds.has(a.id);
                    return (
                      <li key={a.id} className="border rounded-xl p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-semibold text-sm">{a.title}</div>
                            {a.instructions && <p className="text-xs text-ink-500 mt-1">{a.instructions}</p>}
                            <p className="text-[10px] text-ink-400 mt-1">
                              {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No due date"}
                              {a.max_score ? ` Â· max ${a.max_score} pts` : ""}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {done ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        {!done && (
                          <div className="mt-3 flex gap-2">
                            <textarea
                              rows={2}
                              value={drafts[a.id] ?? ""}
                              onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                              placeholder="Write your answerâ€¦"
                              className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
                            />
                            <Button size="sm" disabled={submit.isPending || !(drafts[a.id] ?? "").trim()}
                              onClick={() => submit.mutate({ assignmentId: a.id, content: drafts[a.id] ?? "" })}>
                              Submit
                            </Button>
                          </div>
                        )}
                        {done && submissions.data?.find((s) => s.assignment_id === a.id)?.feedback && (
                          <p className="mt-2 text-xs text-green-700">Feedback: {submissions.data.find((s) => s.assignment_id === a.id)?.feedback}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {section === "Quizzes" && (
            <section className="border rounded-2xl p-6">
              <StudentQuizzes />
            </section>
          )}

          {section === "Progress" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Progress</h2>
              {attendance.data ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm"><span className="text-ink-600">Attendance</span><span className="font-bold">{attendance.data.rate.toFixed(1)}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${attendance.data.rate}%` }} /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div className="rounded-xl bg-green-50 p-3"><div className="text-xl font-extrabold text-green-700">{attendance.data.present}</div><div className="text-[10px] text-ink-500">Present</div></div>
                    <div className="rounded-xl bg-red-50 p-3"><div className="text-xl font-extrabold text-red-700">{attendance.data.absent}</div><div className="text-[10px] text-ink-500">Absent</div></div>
                    <div className="rounded-xl bg-amber-50 p-3"><div className="text-xl font-extrabold text-amber-700">{attendance.data.late}</div><div className="text-[10px] text-ink-500">Late</div></div>
                    <div className="rounded-xl bg-ink-50 p-3"><div className="text-xl font-extrabold text-ink-600">{attendance.data.untracked}</div><div className="text-[10px] text-ink-500">Untracked</div></div>
                  </div>
                  <p className="text-xs text-ink-400">Attendance and assignment progress update after each lesson. Term reports arrive with the gradebook phase.</p>
                </div>
              ) : (
                <Skeleton className="h-24 w-full mt-3" />
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function groupByDate(lessons: Lesson[]): [string, Lesson[]][] {
  const map = new Map<string, Lesson[]>();
  [...lessons]
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .forEach((l) => {
      const key = new Date(l.start_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      map.set(key, [...(map.get(key) ?? []), l]);
    });
  return [...map.entries()];
}
