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
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { getMyProfile } from "@/features/vetting/api";
import { getTutorEarnings } from "@/features/lms/api";
import { BookOpen, MessageSquare, Bell, LifeBuoy, Settings, Wallet, CalendarDays, ClipboardCheck, Users, NotebookPen } from "lucide-react";
import { TutorGradebook, TutorProgressReports } from "@/features/learning/TutorLearning";
import { listAvailability, upsertAvailability, deleteAvailability } from "@/features/portal/api";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Tutor portal â€” tabbed workspace: Overview (KPIs + status + today) Â·
// Lessons (upcoming, attendance, notes) Â· Availability Â· Earnings Â· Profile
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
  { key: "availability", label: "Availability" },
  { key: "earnings", label: "Earnings" },
  { key: "profile", label: "Profile" },
] as const;

export default function TutorDashboardPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
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
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/tutor-dashboard" />
      <RecommendationsForYou />
      <PageHeader
        eyebrow="Tutor"
        title="Home"
        cover="/hero/how-it-works.jpg"
        actions={
          <Link
            href="/lms/tutor"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
          >
            <BookOpen size={15} /> Teach
          </Link>
        }
      />

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

      {/* â”€â”€ Overview â”€â”€ */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Upcoming" value={today.length} hint="lessons" icon={<CalendarDays size={18} />} />
            <StatCard label="Held (escrow)" value={`â‚¦${(earnings.data?.held_total ?? 0).toLocaleString()}`} hint="awaiting delivery" icon={<Wallet size={18} />} />
            <StatCard label="Released" value={`â‚¦${(earnings.data?.released_total ?? 0).toLocaleString()}`} hint="awaiting payout" icon={<ClipboardCheck size={18} />} />
            <StatCard label="Paid out" value={`â‚¦${(earnings.data?.paid_total ?? 0).toLocaleString()}`} hint="total earnings" icon={<Wallet size={18} />} />
          </div>

          {/* Application status */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application</h2>
                {p ? (
                  <>
                    <p className="text-sm text-ink-600 mt-1">{p.display_name} Â· {p.slug}</p>
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
                        {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} â€“ {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} Â· {l.timezone}
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

      {/* â”€â”€ Lessons â”€â”€ */}
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
                      Open roster to mark attendance â†’
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
              Write lesson notes and homework after each session â€” parents see them in their portal.
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
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} Â· {l.timezone}
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

      {/* â”€â”€ Availability â”€â”€ */}
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
              <span className="self-center text-xs text-ink-400">â€“</span>
              <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm" />
            </div>
            <Button size="sm" className="mt-3 w-full" disabled={addSlot.isPending} onClick={() => addSlot.mutate()}>
              {addSlot.isPending ? "Addingâ€¦" : "+ Add slot"}
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
                    <span className="font-semibold text-ink-700">{DAYS[a.day_of_week]} Â· {a.start_time}â€“{a.end_time}</span>
                    <button onClick={() => removeSlot.mutate(a.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* â”€â”€ Earnings â”€â”€ */}
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
              <div className="text-lg font-extrabold text-brand-navy">â‚¦{(earnings.data?.held_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-500">Held</div>
            </div>
            <div className="rounded-xl bg-surface-muted p-3">
              <div className="text-lg font-extrabold text-brand-navy">â‚¦{(earnings.data?.released_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-500">Released</div>
            </div>
            <div className="rounded-xl bg-brand-gold-light p-3">
              <div className="text-lg font-extrabold text-brand-green">â‚¦{(earnings.data?.paid_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-600">Paid out</div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-ink-700">Recent payouts</p>
            {(earnings.data?.payouts ?? []).length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
                No payouts yet â€” released earnings are paid out on the weekly schedule.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(earnings.data?.payouts ?? []).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-ink-700">â‚¦{p.amount.toLocaleString()}</span>
                    <span className="text-xs text-ink-400">
                      {new Date(p.created_at).toLocaleDateString()} Â·{" "}
                      <span className={p.status === "PAID" ? "font-bold text-green-600" : "font-semibold text-ink-500"}>{p.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* â”€â”€ Profile â”€â”€ */}
      {tab === "profile" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application &amp; profile</h2>
                {p ? (
                  <p className="text-sm text-ink-600 mt-1">{p.display_name} Â· {p.slug} Â· <span className="font-semibold">{profileCompletion}% complete</span></p>
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
    </main>
  );
}
