"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { getMyProfile, updateBankDetails } from "@/features/vetting/api";
import { NIGERIAN_BANKS, bankNameForCode } from "@/features/vetting/banks";
import { getTutorEarnings, getCohort } from "@/features/lms/api";
import { Progress } from "@/components/ui/progress";
import { BookOpen, MessageSquare, Bell, LifeBuoy, Settings, Wallet, CalendarDays, ClipboardCheck, Users, NotebookPen } from "lucide-react";
import { TutorGradebook, TutorProgressReports } from "@/features/learning/TutorLearning";
import { listAvailability, upsertAvailability, deleteAvailability } from "@/features/portal/api";
import { listCohorts } from "@/features/cohorts/api/list";
import { requestCohortJoin } from "@/features/cohorts/api/join";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DashHero } from "@/components/dashboard/DashHero";

// Tutor portal — tabbed workspace: Overview (KPIs + status + today) ·
// Lessons (upcoming, attendance, notes) · Availability · Earnings · Profile
// (application + gradebook + reports).

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

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "lessons", label: "Lessons" },
  { key: "cohorts", label: "Cohorts" },
  { key: "availability", label: "Availability" },
  { key: "earnings", label: "Earnings" },
  { key: "profile", label: "Profile" },
] as const;

export default function TutorDashboardPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: "16:00", end_time: "17:00" });
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_code: "", account_number: "", account_name: "" });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

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

  // Teaching cohorts (Udemy-style course cards): group lessons by cohort and
  // resolve each cohort's title + enrolment progress.
  const teachingCohorts = useQuery({
    queryKey: ["tutor", "teaching-cohorts"],
    queryFn: async () => {
      const groups = new Map<string, typeof lessons.data extends (infer L)[] ? L : never>();
      const map = new Map<string, Lesson[]>();
      for (const l of lessons.data ?? []) {
        const cid = l.cohort_id ?? "none";
        const arr = map.get(cid) ?? [];
        arr.push(l);
        map.set(cid, arr);
      }
      const out: { cohortId: string; title: string; lessonCount: number; enrolled: number; capacity: number }[] = [];
      for (const [cid, ls] of map) {
        if (cid === "none") continue;
        try {
          const c = await getCohort(cid);
          out.push({
            cohortId: cid,
            title: c.title,
            lessonCount: ls.length,
            enrolled: c.enrolled_count,
            capacity: c.capacity,
          });
        } catch {
          out.push({ cohortId: cid, title: "Cohort", lessonCount: ls.length, enrolled: 0, capacity: 0 });
        }
      }
      return out;
    },
    enabled: !!user && lessons.isFetched,
  });

  const publishedCohorts = useQuery({
    queryKey: ["tutor", "cohorts", "join"],
    queryFn: async () => {
      const res = await listCohorts({ page: 1, page_size: 50 });
      return res.data ?? [];
    },
    enabled: !!user && tab === "cohorts",
    staleTime: 15_000,
  });

  const joinCohort = useMutation({
    mutationFn: (id: string) => requestCohortJoin(id),
    onSuccess: () => toast.success("Join request sent — admin will review"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not request join"),
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

  // Prefill bank form from the loaded profile (000055 fields).
  useEffect(() => {
    if (p) {
      setBankForm({
        bank_name: p.bank_name ?? "",
        bank_code: p.bank_code ?? "",
        account_number: p.account_number ?? "",
        account_name: p.account_name ?? "",
      });
    }
  }, [p?.bank_name, p?.account_number, p?.account_name]);

  const saveBank = async () => {
    if (!p) return;
    setBankSaving(true);
    setBankError(null);
    try {
      await updateBankDetails(p.id, {
        bank_name: bankForm.bank_name.trim(),
        bank_code: bankForm.bank_code.trim() || undefined,
        account_number: bankForm.account_number.trim(),
        account_name: bankForm.account_name.trim(),
      });
      toast.success("Bank details saved — payouts will go to this account");
      await qc.invalidateQueries({ queryKey: ["tutor", "profile"] });
    } catch (e) {
      setBankError(e instanceof Error ? e.message : "Could not save bank details");
    } finally {
      setBankSaving(false);
    }
  };

  const today = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const recent = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");
  const upcoming = today
    .slice()
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const profileCompletion = p ? Math.min(100, 40 + (p.bio ? 20 : 0) + (p.headline ? 10 : 0) + ((p.hourly_rate_min ?? 0) > 0 ? 15 : 0) + (p.accepts_online || p.accepts_in_person ? 15 : 0)) : 0;

  const quickLinks = [
    { href: "/lms/tutor", label: "Teach", desc: "Roster", icon: BookOpen },
    { href: "/messages", label: "Inbox", desc: "Chat", icon: MessageSquare },
    { href: "/notifications", label: "Alerts", desc: "Reminders", icon: Bell },
    { href: "/contact", label: "Help", desc: "Support", icon: LifeBuoy },
    { href: "/account", label: "Account", desc: "Profile", icon: Settings },
  ];

  return (
    <DashboardPage>
      <RoleGate page="/tutor-dashboard" />
      <DashHero
        icon={<BookOpen size={20} />}
        kicker="Tutor workspace"
        title={p ? `${p.display_name} · ${p.status.replace(/_/g, " ")}` : "Start your tutor application"}
        body={
          upcoming[0]
            ? `Next class: ${upcoming[0].title}. Mark attendance, notes and earnings from here.`
            : "Set availability, complete vetting, and your booked lessons will appear here."
        }
        chipTitle={upcoming[0] ? new Date(upcoming[0].start_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "No class today"}
        chipHint="Next lesson"
        ctaHref="/lms/tutor"
        ctaLabel="Open teaching"
      />
      <RecommendationsForYou />

      <div className="mt-6">
        <DashboardTabs
          tabs={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: t.key === "lessons" ? today.length : t.key === "availability" ? availability.data?.length : undefined,
          }))}
          active={tab}
          onChange={(k) => setTab(k as (typeof TABS)[number]["key"])}
        />
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Upcoming" value={today.length} hint="lessons" icon={<CalendarDays size={18} />} />
            <StatCard label="Held (escrow)" value={`₦${(earnings.data?.held_total ?? 0).toLocaleString()}`} hint="awaiting delivery" icon={<Wallet size={18} />} />
            <StatCard label="Released" value={`₦${(earnings.data?.released_total ?? 0).toLocaleString()}`} hint="awaiting payout" icon={<ClipboardCheck size={18} />} />
            <StatCard label="Paid out" value={`₦${(earnings.data?.paid_total ?? 0).toLocaleString()}`} hint="total earnings" icon={<Wallet size={18} />} />
          </div>

          {/* Application status */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application</h2>
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
            <h2 className="font-bold text-ink-900">Today</h2>
            {lessons.isLoading ? (
              <Skeleton className="h-12 w-full mt-3 bg-white/20" />
            ) : today.length === 0 ? (
              <p className="mt-3 text-sm text-ink-800/70">No lessons today.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcoming.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                    <div>
                      <div className="font-semibold">{l.title}</div>
                      <div className="text-xs text-ink-800/70">
                        {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                      </div>
                    </div>
                    {l.meeting_url && (
                      <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-brand-blue text-sm font-bold px-4 py-2">Join class</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Teaching (Udemy-style course cards) */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-ink-800">Your courses</h2>
              <Link href="/lms/tutor" className="text-sm font-bold text-brand-gold-dark hover:underline">
                Manage courses →
              </Link>
            </div>
            {teachingCohorts.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (teachingCohorts.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 p-6 text-center">
                <p className="text-sm text-ink-500">No cohorts assigned yet.</p>
                <p className="mt-1 text-xs text-ink-400">
                  Request to join a cohort from the Cohorts tab, or ask an admin to assign you — your LMS fills automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(teachingCohorts.data ?? []).map((c) => (
                  <Link
                    key={c.cohortId}
                    href={`/lms/tutor/cohorts/${c.cohortId}`}
                    className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-gold/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-ink-800">{c.title}</p>
                      <span className="rounded-full bg-brand-blue-light px-2.5 py-1 text-[10px] font-bold text-brand-blue">
                        {c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {c.enrolled}/{c.capacity || "—"} enrolled
                    </p>
                    <Progress
                      value={c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0}
                      showValue={false}
                      className="mt-3"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* This week (availability) */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-ink-800">Your teaching schedule</h2>
              <button type="button" onClick={() => setTab("availability")} className="text-sm font-bold text-brand-gold-dark hover:underline">
                Edit availability →
              </button>
            </div>
            {(availability.data ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
                No availability set yet — add slots so bookings can find you.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                  const slots = (availability.data ?? []).filter((a) => a.day_of_week === idx);
                  return (
                    <div key={day} className={`min-w-24 rounded-2xl border p-3 ${slots.length ? "border-brand-gold bg-brand-gold-light" : "border-ink-100 bg-white"}`}>
                      <p className={`text-center text-xs font-bold ${slots.length ? "text-brand-gold-dark" : "text-ink-400"}`}>{day}</p>
                      {slots.length ? (
                        <p className="mt-1 text-center text-[11px] leading-tight text-ink-700">
                          {slots.map((s) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`).join("\n")}
                        </p>
                      ) : (
                        <p className="mt-1 text-center text-[11px] text-ink-300">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick links */}
          <section>
            <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Links</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {quickLinks.map((q) => (
                <Link key={q.href} href={q.href} className="group flex flex-col items-start gap-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-gold">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                    <q.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-brand-navy">{q.label}</span>
                    <span className="block text-xs text-ink-500">{q.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Lessons ── */}
      {tab === "lessons" && (
        <div className="mt-6 space-y-6">
          {/* Attendance to complete */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-bold text-ink-800"><Users size={16} className="text-brand-green" /> Attendance to complete</h2>
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
                    <Link href="/lms/tutor" className="mt-3 inline-flex items-center rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold hover:border-brand-blue transition-colors">
                      Open roster to mark attendance →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Lesson notes */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-bold text-ink-800"><NotebookPen size={16} className="text-brand-green" /> Lesson notes &amp; homework</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Write lesson notes and homework after each session — parents see them in their portal.
            </p>
            <Link href="/lms/tutor" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-brand-blue transition-colors hover:border-brand-blue">
              Open the teaching console <BookOpen size={13} />
            </Link>
          </section>

          {/* All lessons */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">All lessons</h2>
            {lessons.isLoading ? (
              <Skeleton className="mt-3 h-20 w-full" />
            ) : (lessons.data?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No lessons yet" description="Lessons appear once a learner books you." />
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {(lessons.data ?? [])
                  .slice()
                  .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
                  .map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-bold text-ink-800">{l.title}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                        {l.meeting_url && (l.status === "SCHEDULED" || l.status === "ONGOING") && (
                          <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-brand-blue-dark transition-colors">Join</a>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Cohorts ── */}
      {tab === "cohorts" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Request to join a cohort</h2>
            <p className="mt-1 text-sm text-ink-500">
              Approved tutors can ask to teach a published cohort. An admin still assigns you after review.
            </p>
            {p && p.status !== "APPROVED" && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your application is {p.status.replace(/_/g, " ")}. Finish vetting and wait for approval before requesting a cohort.
              </p>
            )}
            {publishedCohorts.isLoading ? (
              <Skeleton className="mt-4 h-20 w-full" />
            ) : (publishedCohorts.data?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No published cohorts" description="Cohorts appear here once admin publishes them." />
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {(publishedCohorts.data ?? []).map((c) => {
                  const mine = p && c.tutor_profile_id === p.id;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-bold text-ink-800">{c.title}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()} · {c.enrolled_count}/{c.capacity} enrolled
                        </p>
                      </div>
                      {mine ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Assigned to you</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!p || p.status !== "APPROVED" || joinCohort.isPending}
                          onClick={() => joinCohort.mutate(c.id)}
                        >
                          Request to join
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Availability ── */}
      {tab === "availability" && (
        <div className="mt-6 grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Add a weekly slot</h2>
            <p className="text-xs text-ink-500 mt-1">Set recurring weekly windows learners can book.</p>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Current availability</h2>
            {availability.isLoading ? (
              <Skeleton className="mt-3 h-16 w-full" />
            ) : (availability.data?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No availability set" description="Add a weekly window so learners can book you." />
            ) : (
              <ul className="mt-3 space-y-1.5">
                {availability.data?.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm border-b border-ink-100 pb-1.5">
                    <span className="font-semibold text-ink-700">{DAYS[a.day_of_week]} · {a.start_time}–{a.end_time}</span>
                    <button onClick={() => removeSlot.mutate(a.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Earnings ── */}
      {tab === "earnings" && (
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
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
          <div className="mt-5 rounded-xl border border-ink-100 bg-surface-muted p-4">
            <p className="text-sm font-bold text-ink-700">Payout destination (bank account)</p>
            <p className="mt-0.5 text-xs text-ink-500">Earnings are transferred to this account. Ask the admin team to confirm each transfer.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-500">Bank</span>
                <select
                  value={bankForm.bank_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    setBankForm({ ...bankForm, bank_code: code, bank_name: bankNameForCode(code) });
                  }}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select your bank…</option>
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
                {bankForm.bank_name && (
                  <span className="mt-0.5 block text-[10px] text-ink-400">{bankForm.bank_name} · code {bankForm.bank_code}</span>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-500">Account number</span>
                <input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/[^0-9]/g, "") })} placeholder="0123456789" maxLength={12} inputMode="numeric" className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-500">Account name</span>
                <input value={bankForm.account_name} onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })} placeholder="e.g. Adaeze Okonkwo" className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
            {bankError && <p className="mt-2 text-xs text-red-600">{bankError}</p>}
            <button type="button" onClick={() => void saveBank()} disabled={bankSaving} className="mt-3 rounded-full bg-brand-navy px-5 py-2 text-xs font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50">
              {bankSaving ? "Saving…" : "Save bank details"}
            </button>
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
      )}

      {/* ── Profile ── */}
      {tab === "profile" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application &amp; profile</h2>
                {p ? (
                  <p className="text-sm text-ink-600 mt-1">{p.display_name} · {p.slug} · <span className="font-semibold">{profileCompletion}% complete</span></p>
                ) : (
                  <p className="text-sm text-ink-500 mt-1">Start your application to appear in tutor search.</p>
                )}
              </div>
              <Link href={p ? "/become-tutor/status" : "/become-tutor/apply"} className="btn-gold text-sm">
                {p ? "View application" : "Start application"}
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <TutorGradebook />
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <TutorProgressReports />
          </section>
        </div>
      )}
    </DashboardPage>
  );
}
