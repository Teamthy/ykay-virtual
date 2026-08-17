"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/features/vetting/api";
import { getTutorEarnings } from "@/features/lms/api";
import { BookOpen, MessageSquare, Bell, LifeBuoy, Settings, Wallet } from "lucide-react";
import { TutorGradebook, TutorProgressReports } from "@/features/learning/TutorLearning";
import { listAvailability, upsertAvailability, deleteAvailability } from "@/features/portal/api";
import { DashboardShell } from "@/components/layout/DashboardShell";

// Tutor portal (working-doc §11): status + profile completion, availability,
// today's lessons, attendance roster, lesson notes, earnings, support.

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
  cohort_id?: string;
};

type AttendanceRow = { id: string; lesson_id: string; student_profile_id: string; status: string; marked_at: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  INTERVIEW: "bg-blue-100 text-blue-700",
  VERIFICATION: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  HOLD: "bg-ink-100 text-ink-600",
};

export default function TutorDashboardPage() {
  const qc = useQueryClient();
  // G1: the tutor profile resolves from the session server-side.
  const { user } = useSession();
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: "16:00", end_time: "17:00" });

  const profile = useQuery({
    queryKey: ["vetting", "me", user?.id],
    queryFn: () => getMyProfile(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const lessons = useQuery({
    queryKey: ["tutor", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/tutor-lessons");
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["tutor", "attendance"],
    queryFn: async () => {
      const res = await apiFetch<AttendanceRow[]>(`/lessons/${lessons.data?.[0]?.id}/attendance`);
      return res.data ?? [];
    },
    enabled: (lessons.data?.length ?? 0) > 0,
    staleTime: 15_000,
  });

  const availability = useQuery({
    queryKey: ["tutor", "availability"],
    queryFn: () => listAvailability(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const earnings = useQuery({
    queryKey: ["tutor", "earnings"],
    queryFn: () => getTutorEarnings(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addSlot = useMutation({
    mutationFn: () =>
      upsertAvailability({
        day_of_week: newSlot.day_of_week,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        is_recurring: true,
      }),
    onSuccess: () => {
      toast.success("Availability slot added");
      qc.invalidateQueries({ queryKey: ["tutor", "availability"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add slot"),
  });

  const removeSlot = useMutation({
    mutationFn: (id: string) => deleteAvailability(id),
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["tutor", "availability"] });
    },
  });

  const p = profile.data;
  const today = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const recent = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");

  const profileCompletion = p ? Math.min(100, 40 + (p.bio ? 20 : 0) + (p.headline ? 10 : 0) + ((p.hourly_rate_min ?? 0) > 0 ? 15 : 0) + (p.accepts_online || p.accepts_in_person ? 15 : 0)) : 0;

  return (
    <DashboardShell>
    <main className="container-x py-10">
      <RoleGate page="/tutor-dashboard" />
      <RecommendationsForYou />
      <h1 className="text-3xl font-extrabold">Tutor dashboard</h1>
      <p className="text-ink-500 text-sm mt-1">Your application, schedule, attendance and earnings.</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {/* Status + profile completion */}
          <section className="rounded-2xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Application status</h2>
                {p ? (
                  <>
                    <p className="text-sm text-ink-600 mt-1">{p.display_name} · {p.slug}</p>
                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[p.status] ?? "bg-ink-100"}`}>{p.status}</span>
                  </>
                ) : (
                  <p className="text-sm text-ink-500 mt-1">You haven&apos;t started your application yet.</p>
                )}
              </div>
              <Link href={p ? "/become-tutor/status" : "/become-tutor/apply"} className="btn-gold text-sm">
                {p ? "View application" : "Start application"}
              </Link>
            </div>
            {p && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-ink-500"><span>Profile completion</span><span>{profileCompletion}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${profileCompletion}%` }} /></div>
              </div>
            )}
          </section>

          {/* Today's lessons */}
          <section className="rounded-2xl bg-brand-gold text-ink-900 p-6">
            <h2 className="font-bold">Today&apos;s lessons</h2>
            {lessons.isLoading ? (
              <Skeleton className="h-12 w-full mt-3 bg-white/20" />
            ) : today.length === 0 ? (
              <p className="mt-3 text-sm text-white/80">No lessons today.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {today.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                    <div>
                      <div className="font-semibold">{l.title}</div>
                      <div className="text-xs text-white/70">
                        {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/lessons/${l.id}`} className="rounded-xl bg-white text-brand-blue text-sm font-bold px-4 py-2">Open lesson</Link>
                      {l.meeting_url && (
                        <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-gold text-ink-800 text-sm font-bold px-4 py-2">Join class</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Attendance roster */}
          <section className="rounded-2xl border p-6">
            <h2 className="font-bold">Attendance to complete</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No completed lessons awaiting attendance.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recent.slice(0, 5).map((l) => (
                  <li key={l.id} className="border rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                      </div>
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Mark attendance</span>
                    </div>
                    <div className="mt-3">
                      {/* G1: attendance is marked per learner from the class roster
                          in the teaching console (no fixture learner IDs). */}
                      <Link
                        href="/lms/tutor"
                        className="inline-flex items-center rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold hover:border-brand-blue transition-colors"
                      >
                        Open roster to mark attendance →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Lesson notes outstanding */}
          <section className="rounded-2xl border p-6">
            <h2 className="font-bold">Lesson notes outstanding</h2>
            <p className="mt-2 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-6 text-center">
              Write lesson notes and homework after each session — parents see them in their portal.{" "}
              <a href="/contact" className="text-brand-blue font-semibold hover:underline">Notes UI arrives with the full lesson workspace.</a>
            </p>
          </section>

          {/* My cohorts / private learners */}
          <section className="rounded-2xl border p-6">
            <h2 className="font-bold">My cohorts & private learners</h2>
            <p className="mt-2 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-6 text-center">
              Assigned cohorts and private packages appear here once you&apos;re approved and booked.
            </p>
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-5 lg:sticky lg:top-28">
          {/* Availability editor */}
          <section className="rounded-2xl border p-6">
            <h2 className="font-bold">Availability</h2>
            <p className="text-xs text-ink-500 mt-1">Set recurring weekly slots.</p>
            <div className="mt-3 flex gap-2">
              <select value={newSlot.day_of_week} onChange={(e) => setNewSlot({ ...newSlot, day_of_week: Number(e.target.value) })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm" />
              <span className="self-center text-xs text-ink-400">–</span>
              <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm" />
            </div>
            <Button size="sm" className="mt-3 w-full" disabled={addSlot.isPending} onClick={() => addSlot.mutate()}>
              {addSlot.isPending ? "Adding…" : "+ Add slot"}
            </Button>
            {availability.data && availability.data.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {availability.data.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm border-b border-ink-100 pb-1.5">
                    <span>{DAYS[a.day_of_week]} · {a.start_time}–{a.end_time}</span>
                    <button onClick={() => removeSlot.mutate(a.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Earnings — live from /me/earnings (escrow ledger) */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-brand-navy">
                <Wallet size={16} className="text-brand-green" /> Earnings
              </h2>
              <span className="rounded-full bg-brand-gold-light px-3 py-1 text-xs font-bold text-brand-navy">Escrow-protected</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">Held until lessons are confirmed, then paid out on the weekly schedule.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-muted p-3">
                <div className="text-lg font-extrabold text-brand-navy">₦{(earnings.data?.held_total ?? 0).toLocaleString()}</div>
                <div className="text-[10px] font-semibold text-ink-500">Held</div>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <div className="text-lg font-extrabold text-brand-navy">₦{(earnings.data?.released_total ?? 0).toLocaleString()}</div>
                <div className="text-[10px] font-semibold text-ink-500">Released</div>
              </div>
              <div className="rounded-xl bg-brand-gold-light p-3">
                <div className="text-lg font-extrabold text-brand-green">₦{(earnings.data?.paid_total ?? 0).toLocaleString()}</div>
                <div className="text-[10px] font-semibold text-ink-600">Paid out</div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-ink-700">Recent payouts</p>
              {(earnings.data?.payouts ?? []).length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
                  No payouts yet — released earnings are paid out on the weekly schedule.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {(earnings.data?.payouts ?? []).slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-2.5 text-sm">
                      <span className="font-semibold text-ink-700">₦{p.amount.toLocaleString()}</span>
                      <span className="text-xs text-ink-400">
                        {new Date(p.created_at).toLocaleDateString()} ·{" "}
                        <span className={p.status === "PAID" ? "font-bold text-green-600" : "font-semibold text-ink-500"}>{p.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Gradebook (phase 11c) */}
          <section className="rounded-2xl border p-6">
            <TutorGradebook />
          </section>

          {/* Progress reports (phase 11c) */}
          <section className="rounded-2xl border p-6">
            <TutorProgressReports />
          </section>

          {/* Quick links */}
          <div className="flex flex-col gap-3">
            <Link href="/lms/tutor" className="flex items-center justify-center gap-2 rounded-xl bg-brand-gold py-3 text-center text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"><BookOpen size={15} /> Teaching console</Link>
            <Link href="/messages" className="flex items-center justify-center gap-2 rounded-xl border py-3 text-center text-sm font-bold text-ink-700 hover:border-brand-blue"><MessageSquare size={15} /> Messages</Link>
            <Link href="/notifications" className="flex items-center justify-center gap-2 rounded-xl border py-3 text-center text-sm font-bold text-ink-700 hover:border-brand-blue"><Bell size={15} /> Notifications</Link>
            <Link href="/contact" className="flex items-center justify-center gap-2 rounded-xl border py-3 text-center text-sm font-bold text-ink-700 hover:border-brand-blue"><LifeBuoy size={15} /> Support</Link>
            <Link href="/account" className="flex items-center justify-center gap-2 rounded-xl border py-3 text-center text-sm font-bold text-ink-700 hover:border-brand-blue"><Settings size={15} /> Account settings</Link>
          </div>
        </aside>
      </div>
    </main>
    </DashboardShell>
  );
}
