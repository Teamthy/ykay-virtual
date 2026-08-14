"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { CalendarDays, ReceiptText, MessageSquareText, Wallet, LineChart, CreditCard } from "lucide-react";
import { unreadCount } from "@/features/messaging/api";
import { ReferralCard } from "@/features/referrals/ReferralCard";
import { listProgressReports } from "@/features/learning/api";
import { listLearners, type Learner } from "@/features/onboarding/api";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { getAttendanceSummary, getOrderReceipt, type OrderReceipt } from "@/features/portal/api";

// Parent portal — Tuteria bookings-style (tuteria.com/users/bookings):
// sidebar nav + status-filtered booking cards + payments with receipts.

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
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
  { key: "bookings", label: "Bookings", icon: <CalendarDays size={16} /> },
  { key: "payments", label: "Payments", icon: <Wallet size={16} /> },
  { key: "progress", label: "Progress", icon: <LineChart size={16} /> },
] as const;

const BOOKING_TABS = ["All", "Upcoming", "Completed", "Cancelled"] as const;

export default function ParentDashboardPage() {
  const { user } = useSession();
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const [section, setSection] = useState<(typeof NAV)[number]["key"]>("bookings");
  const [tab, setTab] = useState<(typeof BOOKING_TABS)[number]>("All");
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

  const nextPayment = (orders.data ?? []).find((o) => o.status === "PENDING");
  const paidCount = (orders.data ?? []).filter((o) => o.status === "PAID").length;

  return (
    <main className="bg-surface-muted min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Sidebar nav */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft">
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              {user ? `Hi, ${user.email.split("@")[0]}` : "Dashboard"}
            </p>
            <ul className="space-y-0.5">
              {NAV.map((n) => (
                <li key={n.key}>
                  <button
                    onClick={() => setSection(n.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      section === n.key ? "bg-brand-gold text-ink-900" : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    <span className={section === n.key ? "text-ink-900" : "text-brand-blue"}>{n.icon}</span>
                    {n.label}
                    {n.key === "payments" && paidCount > 0 && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${section === n.key ? "bg-black/10" : "bg-brand-gold-light text-brand-gold-dark"}`}>
                        {paidCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-100 mt-2 pt-2 space-y-0.5">
              <Link href="/messages" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100">
                <MessageSquareText size={16} className="text-brand-blue" />
                Messages
                {unread.data ? <span className="ml-auto rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold text-brand-navy">{unread.data}</span> : null}
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <Link href="/private-tuition" className="rounded-full bg-brand-gold px-5 py-3 text-center text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover">
              Book more tuition
            </Link>
            <Link href="/programmes" className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-center text-sm font-bold text-ink-700 hover:bg-ink-100 transition-colors">
              Find a programme
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="space-y-6">
          <RoleGate page="/dashboard" />
          <RecommendationsForYou />

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl tracking-[0.02em] text-brand-navy">Bookings</h1>
              <p className="mt-1 text-sm text-ink-500">Lessons, payments and progress for your family.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-bold uppercase tracking-wide text-[10px] text-ink-400">SELECT LEARNER</span>
              <select
                value={selectedLearner || activeLearner?.id || ""}
                onChange={(e) => setSelectedLearner(e.target.value)}
                className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              >
                {(learners.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                ))}
                {(learners.data ?? []).length === 0 && <option value="">Add a learner…</option>}
              </select>
            </label>
          </div>

          {!learnerId && (
            <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue-light/60 p-6 text-sm">
              <strong className="text-brand-navy">No learner linked yet.</strong>{" "}
              <span className="text-ink-600">Add your first learner to see schedules, attendance and progress.</span>{" "}
              <Link href="/onboarding/learner" className="font-semibold text-brand-blue hover:underline">Add a learner →</Link>
            </div>
          )}

          {nextPayment && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <CreditCard size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-800">Payment pending — {nextPayment.order_number}</p>
                  <p className="text-xs text-ink-500">{nextPayment.currency} {nextPayment.total_amount.toLocaleString()} · completes your booking</p>
                </div>
              </div>
              <a href={`/checkout/${nextPayment.id}`} className="rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-navy hover:bg-brand-gold-dark transition-colors">
                Complete payment
              </a>
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
                      tab === t ? "bg-brand-gold text-ink-900" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {!learnerId ? (
                <p className="text-sm text-ink-500">Link a learner to see their schedule.</p>
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
                    <li key={l.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                            <CalendarDays size={18} />
                          </span>
                          <div>
                            <p className="font-bold text-ink-800">{l.title}</p>
                            <p className="text-xs text-ink-500">
                              {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                          {l.meeting_url && (l.status === "SCHEDULED" || l.status === "ONGOING") && (
                            <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-brand-blue-dark transition-colors">
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
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-bold text-ink-800">Payments &amp; receipts</h2>
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
                        <span className="font-mono text-xs text-ink-600">{o.order_number}</span>
                        <div className="mt-1"><StatusBadge label={o.status} kind={statusKindFor(o.status)} /></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink-800">{o.currency} {o.total_amount.toLocaleString()}</span>
                        <button
                          onClick={() => void openReceipt(o.id)}
                          className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light transition-colors"
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
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-ink-800">Attendance summary</h2>
                {attendance.data ? (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "Present", value: attendance.data.present, cls: "text-brand-green" },
                      { label: "Absent", value: attendance.data.absent, cls: "text-red-600" },
                      { label: "Late", value: attendance.data.late, cls: "text-amber-600" },
                      { label: "Rate", value: `${attendance.data.rate.toFixed(0)}%`, cls: "text-brand-blue" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-surface-muted p-3">
                        <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</div>
                        <div className="text-[10px] text-ink-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">Attendance appears after lessons begin.</p>
                )}
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-ink-800">Progress reports</h2>
                {reports.isLoading ? (
                  <Skeleton className="mt-3 h-24 w-full" />
                ) : (reports.data ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500 rounded-xl border border-dashed border-ink-200 p-6 text-center">
                    No progress reports yet — your tutor shares them here after lessons begin.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(reports.data ?? []).map((r) => (
                      <div key={r.id} className="rounded-xl border border-ink-100 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink-700">
                            {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                          </p>
                          <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                            ★ {r.overall_rating}/5
                          </span>
                        </div>
                        {r.strengths && <p className="mt-2 text-sm text-ink-600">💪 {r.strengths}</p>}
                        {r.weaknesses && <p className="mt-1 text-sm text-ink-600">⚠️ {r.weaknesses}</p>}
                        {r.recommendations && <p className="mt-1 text-sm text-ink-700">🎯 {r.recommendations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <ReferralCard userId={user?.id ?? ""} />
          <Link
            href="/account"
            className="mt-4 block rounded-2xl border border-ink-100 bg-white p-5 shadow-soft text-center text-sm font-bold text-brand-navy hover:border-brand-gold"
          >
            ⚙️ Account settings
          </Link>
        </div>
      </div>

      {/* Receipt modal */}
      <Modal
        open={receipt !== null || receiptLoading}
        onClose={() => setReceipt(null)}
        title="Receipt"
        description={receipt ? receipt.order.order_number : "Loading…"}
      >
        {receipt && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-surface-muted p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-ink-500">Status</span><StatusBadge label={receipt.order.status} kind={statusKindFor(receipt.order.status)} /></div>
              <div className="flex justify-between"><span className="text-ink-500">Date</span><span className="font-semibold text-ink-800">{new Date(receipt.order.created_at).toLocaleDateString()}</span></div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-ink-800">Items</h3>
              <ul className="space-y-1.5">
                {receipt.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-ink-600">
                    <span>{it.description ?? it.item_type.replace(/_/g, " ")} × {it.quantity}</span>
                    <span className="font-semibold text-ink-800">{receipt.order.currency} {it.total_price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-ink-100 pt-2 mt-2 font-bold text-ink-800">
                <span>Total</span><span>{receipt.order.currency} {receipt.order.total_amount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-ink-800">Payments</h3>
              <ul className="space-y-1.5 text-xs">
                {receipt.payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-ink-600">
                    <span>{p.provider.replace(/_/g, " ")}{p.provider_reference ? ` · ${p.provider_reference.slice(0, 14)}…` : ""}</span>
                    <StatusBadge label={p.status} kind={statusKindFor(p.status)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
