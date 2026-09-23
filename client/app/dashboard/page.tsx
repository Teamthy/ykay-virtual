"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import {
  CalendarDays,
  ReceiptText,
  MessageSquareText,
  Wallet,
  LineChart,
  CreditCard,
  UserPlus,
  Settings,
  TrendingUp,
  AlertTriangle,
  Compass,
  LayoutDashboard,
  Users,
  FileText,
} from "lucide-react";
import { unreadCount } from "@/features/messaging/api";
import { listProgressReports } from "@/features/learning/api";
import { createLearner, listLearners, type Learner } from "@/features/onboarding/api";
import { CurriculumLevelSelect } from "@/features/onboarding/CurriculumLevelSelect";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { WelcomeQuote } from "@/components/dashboard/WelcomeQuote";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { getAttendanceSummary, getOrderReceipt, type OrderReceipt } from "@/features/portal/api";
import { DigestPrefsToggle } from "@/features/learning/DigestPrefsToggle";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DashHero, SideCard } from "@/components/dashboard/DashHero";
import { CircleHelp } from "lucide-react";

// Parent portal — bookings-style family dashboard. Sidebar nav + sections:
// Overview (KPIs + next lesson) · Bookings (status-filtered lessons) ·
// Payments (orders + receipts) · Progress (attendance + reports) ·
// Learners (management).

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  checkout_cohort_id?: string; // resumable checkout (Batch 4)
};

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

const NAV = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { key: "bookings", label: "Bookings", icon: <CalendarDays size={16} /> },
  { key: "payments", label: "Payments", icon: <Wallet size={16} /> },
  { key: "progress", label: "Progress", icon: <LineChart size={16} /> },
  { key: "learners", label: "Learners", icon: <Users size={16} /> },
] as const;

const BOOKING_TABS = ["All", "Upcoming", "Completed", "Cancelled"] as const;

export default function ParentDashboardPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", date_of_birth: "", current_level: "", school_name: "" });
  const [section, setSection] = useState<(typeof NAV)[number]["key"]>("overview");
  const [tab, setTab] = useState<(typeof BOOKING_TABS)[number]>("All");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("section");
    if (s && NAV.some((n) => n.key === s)) {
      setSection(s as (typeof NAV)[number]["key"]);
    }
  }, []);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });

  const activeLearner: Learner | undefined = (learners.data ?? []).find((l) => l.id === selectedLearner) ?? (learners.data ?? [])[0];
  const learnerId = activeLearner?.id ?? "";

  const reports = useQuery({
    queryKey: ["dashboard", "reports", selectedLearner],
    queryFn: () => listProgressReports(selectedLearner || undefined),
    enabled: !!selectedLearner,
    staleTime: 60_000,
  });

  const orders = useQuery({
    queryKey: ["me", "orders"],
    queryFn: async () => {
      const res = await apiFetch<Order[]>("/me/orders");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const lessons = useQuery({
    queryKey: ["parent", "lessons", learnerId],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>(`/me/lessons?student_profile_id=${learnerId}`);
      return res.data ?? [];
    },
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["parent", "attendance", learnerId],
    queryFn: () => getAttendanceSummary(learnerId),
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => unreadCount(),
    enabled: !!user,
    staleTime: 15_000,
  });

  const openReceipt = async (orderId: string) => {
    setReceiptLoading(true);
    try {
      const r = await getOrderReceipt(orderId);
      setReceipt(r);
    } finally {
      setReceiptLoading(false);
    }
  };

  const all = lessons.data ?? [];
  const filtered = all.filter((l) => {
    if (tab === "Upcoming") return l.status === "SCHEDULED" || l.status === "ONGOING";
    if (tab === "Completed") return l.status === "COMPLETED";
    if (tab === "Cancelled") return l.status === "CANCELLED" || l.status === "NO_SHOW";
    return true;
  });

  const upcoming = all
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const nextLesson = upcoming[0];
  const nextPayment = (orders.data ?? []).find((o) => o.status === "PENDING");
  const paidCount = (orders.data ?? []).filter((o) => o.status === "PAID").length;

  return (
    <DashboardPage>
        <div className="space-y-6">
          <RoleGate page="/dashboard" />
          <WelcomeQuote />
          <DashHero
            icon={<Users size={20} />}
            kicker="Family"
            title={learnerId ? `${activeLearner?.first_name}'s learning home` : "Add a learner to get started"}
            body={
              nextLesson
                ? `Next lesson: ${nextLesson.title}. Manage bookings, payments and progress from this dashboard.`
                : "Book a tutor or join a cohort. Schedules, receipts and attendance will land here."
            }
            chipTitle={nextLesson ? new Date(nextLesson.start_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "No class yet"}
            chipHint="Next lesson"
            ctaHref={learnerId ? "/lms" : undefined}
            ctaLabel={learnerId ? "Open LMS" : undefined}
          />
          <div className="flex flex-wrap items-center gap-2">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setSection(n.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  section === n.key ? "bg-[#0F2A1A] text-white" : "bg-white text-[#0F2A1A]/75 ring-1 ring-black/10 hover:bg-[#F9F6ED]"
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Learner</span>
              <select
                value={selectedLearner || activeLearner?.id || ""}
                onChange={(e) => setSelectedLearner(e.target.value)}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#0F2A1A]/85"
              >
                {(learners.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                ))}
                {(learners.data ?? []).length === 0 && <option value="">Add a learner…</option>}
              </select>
            </label>
          </div>
          <RecommendationsForYou />

          {!learnerId && (
            <div className="rounded-2xl border border-[#0F2A1A]/20 bg-[#F9F6ED]/60 p-6 text-sm">
              <strong className="text-[#0F2A1A]">No learner linked yet.</strong>{" "}
              <span className="text-[#0F2A1A]/70">Add your first learner to see schedules, attendance and progress.</span>{" "}
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-[#0F2A1A] hover:underline">
                <UserPlus size={15} /> Add a learner →
              </button>
            </div>
          )}

          {nextPayment && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <CreditCard size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F2A1A]/85">Payment pending — {nextPayment.order_number}</p>
                  <p className="text-xs text-[#0F2A1A]/65">{nextPayment.currency} {nextPayment.total_amount.toLocaleString()} · completes your booking</p>
                </div>
              </div>
              <a href={nextPayment.checkout_cohort_id ? `/checkout/${nextPayment.checkout_cohort_id}` : "/cohorts"} className="rounded-xl bg-[#D6FF57] px-6 py-3 text-sm font-bold text-[#0F2A1A] hover:bg-[#0F2A1A] transition-colors">
                Complete payment
              </a>
            </div>
          )}

          {/* Section: Overview */}
          {section === "overview" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Upcoming" value={upcoming.length} hint="lessons" icon={<CalendarDays size={18} />} />
                <StatCard label="Learners" value={(learners.data ?? []).length} hint="linked to your account" icon={<Users size={18} />} />
                <StatCard label="Paid orders" value={paidCount} hint="completed payments" icon={<Wallet size={18} />} />
                <StatCard
                  label="Attendance"
                  value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"}
                  hint={attendance.data ? `${attendance.data.present} present of ${attendance.data.total}` : "link a learner"}
                  icon={<LineChart size={18} />}
                />
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { href: "/tutors", label: "Find a tutor", icon: <Users size={16} /> },
                  { href: "/private-tuition", label: "Request tuition", icon: <Wallet size={16} /> },
                  { href: "/cohorts", label: "Browse cohorts", icon: <CalendarDays size={16} /> },
                  { href: "/dashboard?section=bookings", label: "My bookings", icon: <FileText size={16} />, section: "bookings" as const },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={(e) => {
                      if ("section" in a && a.section) {
                        e.preventDefault();
                        setSection(a.section);
                      }
                    }}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 bg-white p-4 text-sm font-semibold text-[#0F2A1A] transition-all hover:border-[#0F2A1A] hover:shadow-lift"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-[#F9F6ED] text-[#0F2A1A]">{a.icon}</span>
                    {a.label}
                  </Link>
                ))}
              </div>

              {nextLesson ? (
                <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F9F6ED] text-[#0F2A1A]">
                        <CalendarDays size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">Next lesson</p>
                        <p className="font-bold text-[#0F2A1A]/85">{nextLesson.title}</p>
                        <p className="text-xs text-[#0F2A1A]/65">
                          {new Date(nextLesson.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {nextLesson.timezone}
                        </p>
                      </div>
                    </div>
                    {nextLesson.meeting_url && (
                      <a href={nextLesson.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-[#0F2A1A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F2A1A] transition-colors">
                        Join class
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDays size={20} />}
                  title="No upcoming lessons"
                  description="When lessons are booked they appear here with time and join links."
                  action={
                    <Link href="/private-tuition" className="rounded-full bg-[#D6FF57] px-6 py-3 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030]">
                      Book tuition
                    </Link>
                  }
                />
              )}
            </div>
            <aside className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <SideCard
                icon={<CircleHelp size={18} />}
                title="Have a question?"
                body="Support can help with bookings, payments and learner accounts."
                href="/help"
                link="Contact support →"
                image="/home/card-tutoring.jpg"
              />
              <SideCard
                icon={<Users size={18} />}
                title="Manage learners"
                body="Add a child, switch profiles, or jump into their bookings."
                href="/dashboard?section=learners"
                link="Open learners →"
                image="/home/campus-hero.jpg"
                onClick={() => setSection("learners")}
              />
              <SideCard
                icon={<MessageSquareText size={18} />}
                title="Messages"
                body="Chat with tutors and support about your family's learning."
                href="/messages"
                link="Open inbox →"
                image="/home/card-cbt.jpg"
              />
            </aside>
            </div>
          )}

          {/* Section: Bookings */}
          {section === "bookings" && (
            <>
              <div className="flex gap-2 flex-wrap">
                {BOOKING_TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      tab === t ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-white text-[#0F2A1A]/70 ring-1 ring-black/10 hover:bg-[#F9F6ED]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {!learnerId ? (
                <p className="text-sm text-[#0F2A1A]/65">Link a learner to see their schedule.</p>
              ) : lessons.isLoading ? (
                <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={20} />}
                  title={`No ${tab === "All" ? "" : tab.toLowerCase() + " "}bookings`}
                  description="When lessons are booked they appear here with status, time and join links."
                />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((l) => (
                    <li key={l.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-soft">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F9F6ED] text-[#0F2A1A]">
                            <CalendarDays size={18} />
                          </span>
                          <div>
                            <p className="font-bold text-[#0F2A1A]/85">{l.title}</p>
                            <p className="text-xs text-[#0F2A1A]/65">
                              {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                          {l.meeting_url && (l.status === "SCHEDULED" || l.status === "ONGOING") && (
                            <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-[#0F2A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F2A1A] transition-colors">
                              Join class
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Section: Payments */}
          {section === "payments" && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
              <h2 className="font-bold text-[#0F2A1A]/85">Payments &amp; receipts</h2>
              {orders.isLoading ? (
                <Skeleton className="h-16 w-full mt-4" />
              ) : (orders.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<ReceiptText size={20} />}
                  title="No payments yet"
                  description="Your orders and receipts will appear here."
                />
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {orders.data?.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <span className="font-mono text-xs text-[#0F2A1A]/70">{o.order_number}</span>
                        <div className="mt-1"><StatusBadge label={o.status} kind={statusKindFor(o.status)} /></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#0F2A1A]/85">{o.currency} {o.total_amount.toLocaleString()}</span>
                        <button
                          onClick={() => void openReceipt(o.id)}
                          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#0F2A1A] hover:bg-[#F9F6ED] transition-colors"
                        >
                          Receipt
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Section: Progress */}
          {section === "progress" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-[#0F2A1A]/85">Attendance summary</h2>
                {attendance.data ? (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "Present", value: attendance.data.present, cls: "text-[#0F2A1A]" },
                      { label: "Absent", value: attendance.data.absent, cls: "text-red-600" },
                      { label: "Late", value: attendance.data.late, cls: "text-amber-600" },
                      { label: "Rate", value: `${attendance.data.rate.toFixed(0)}%`, cls: "text-[#0F2A1A]" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-[#F9F6ED] p-3">
                        <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</div>
                        <div className="text-[10px] text-[#0F2A1A]/65">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#0F2A1A]/65">Attendance appears after lessons begin.</p>
                )}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-[#0F2A1A]/85">Progress reports</h2>
                {reports.isLoading ? (
                  <Skeleton className="mt-3 h-24 w-full" />
                ) : (reports.data ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-[#0F2A1A]/65 rounded-xl border border-dashed border-black/10 p-6 text-center">
                    No progress reports yet — your tutor shares them here after lessons begin.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(reports.data ?? []).map((r) => (
                      <div key={r.id} className="rounded-xl border border-black/10 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#0F2A1A]/75">
                            {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                          </p>
                          <span className="rounded-full bg-[#F9F6ED] px-2.5 py-0.5 text-xs font-bold text-[#0F2A1A]">
                            ★ {r.overall_rating}/5
                          </span>
                        </div>
                        {r.strengths && <p className="mt-2 flex items-start gap-2 text-sm text-[#0F2A1A]/70"><TrendingUp size={15} className="mt-0.5 shrink-0 text-[#0F2A1A]" /> {r.strengths}</p>}
                        {r.weaknesses && <p className="mt-1 flex items-start gap-2 text-sm text-[#0F2A1A]/70"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /> {r.weaknesses}</p>}
                        {r.recommendations && <p className="mt-1 flex items-start gap-2 text-sm text-[#0F2A1A]/75"><Compass size={15} className="mt-0.5 shrink-0 text-[#0F2A1A]" /> {r.recommendations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DigestPrefsToggle />
            </div>
          )}

          {/* Section: Learners */}
          {section === "learners" && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-[#0F2A1A]/85">Learners</h2>
                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-sm font-bold text-[#0F2A1A] transition-colors hover:bg-[#C8F030]"
                >
                  <UserPlus size={15} /> Add a learner
                </button>
              </div>
              {learners.isLoading ? (
                <Skeleton className="mt-4 h-20 w-full" />
              ) : (learners.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No learners yet"
                  description="Add your first child to see their schedule, attendance and progress."
                />
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {(learners.data ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F9F6ED] font-bold text-[#0F2A1A]">
                          {l.first_name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <p className="font-bold text-[#0F2A1A]/85">{l.first_name} {l.last_name ?? ""}</p>
                          <p className="text-xs text-[#0F2A1A]/65">
                            {l.current_level ?? "Level not set"}
                            {l.school_name ? ` · ${l.school_name}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedLearner(l.id); setSection("bookings"); }}
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#0F2A1A] hover:bg-[#F9F6ED] transition-colors"
                      >
                        View bookings
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Link
            href="/account"
            className="mt-4 block rounded-2xl border border-black/10 bg-white p-5 shadow-soft text-center text-sm font-bold text-[#0F2A1A] hover:border-[#D6FF57]"
          >
            <span className="inline-flex items-center gap-2"><Settings size={16} /> Account</span>
          </Link>
        </div>

      {/* Add-learner modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddError(null); }} title="Add a learner">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setAddSubmitting(true);
            setAddError(null);
            try {
              await createLearner({
                first_name: addForm.first_name.trim(),
                last_name: addForm.last_name.trim(),
                date_of_birth: addForm.date_of_birth || undefined,
                current_level: addForm.current_level.trim() || undefined,
                school_name: addForm.school_name.trim() || undefined,
                relationship: "PARENT",
              });
              await qc.invalidateQueries({ queryKey: ["onboarding", "learners"] });
              await qc.invalidateQueries({ queryKey: ["session", "context"] });
              setAddForm({ first_name: "", last_name: "", date_of_birth: "", current_level: "", school_name: "" });
              setAddOpen(false);
            } catch (err) {
              setAddError(err instanceof Error ? err.message : "Could not add learner");
            } finally {
              setAddSubmitting(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">First name *</span>
              <input required value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">Last name *</span>
              <input required value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">Date of birth</span>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={addForm.date_of_birth}
                onChange={(e) => setAddForm({ ...addForm, date_of_birth: e.target.value })}
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30"
              />
            </label>
            <div className="sm:col-span-2">
              <CurriculumLevelSelect
                value={addForm.current_level}
                onChange={(level) => setAddForm({ ...addForm, current_level: level })}
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">School (optional)</span>
              <input value={addForm.school_name} onChange={(e) => setAddForm({ ...addForm, school_name: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30" />
            </label>
          </div>
          {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>}
          <button type="submit" disabled={addSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#D6FF57] text-sm font-bold text-[#0F2A1A] transition-colors hover:bg-[#C8F030] disabled:opacity-50">
            {addSubmitting ? "Adding…" : "Add learner"}
          </button>
        </form>
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={receipt !== null || receiptLoading}
        onClose={() => setReceipt(null)}
        title="Receipt"
        description={receipt ? receipt.order.order_number : "Loading…"}
      >
        {receipt && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-[#F9F6ED] p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-[#0F2A1A]/65">Status</span><StatusBadge label={receipt.order.status} kind={statusKindFor(receipt.order.status)} /></div>
              <div className="flex justify-between"><span className="text-[#0F2A1A]/65">Date</span><span className="font-semibold text-[#0F2A1A]/85">{new Date(receipt.order.created_at).toLocaleDateString()}</span></div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-[#0F2A1A]/85">Items</h3>
              <ul className="space-y-1.5">
                {receipt.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-[#0F2A1A]/70">
                    <span>{it.description ?? it.item_type.replace(/_/g, " ")} × {it.quantity}</span>
                    <span className="font-semibold text-[#0F2A1A]/85">{receipt.order.currency} {it.total_price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-black/10 pt-2 mt-2 font-bold text-[#0F2A1A]/85">
                <span>Total</span><span>{receipt.order.currency} {receipt.order.total_amount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-[#0F2A1A]/85">Payments</h3>
              <ul className="space-y-1.5 text-xs">
                {receipt.payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-[#0F2A1A]/70">
                    <span>{p.provider.replace(/_/g, " ")}{p.provider_reference ? ` · ${p.provider_reference.slice(0, 14)}…` : ""}</span>
                    <StatusBadge label={p.status} kind={statusKindFor(p.status)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </DashboardPage>
  );
}
