"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAdminStats2 } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Admin dashboard (working-doc §12): KPI cards - active learners | tutors |
// cohorts | lessons this week | revenue + pending applications/enrolments,
// today's classes, capacity alerts, support tickets, QA alerts.

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-brand-blue text-white border-brand-blue" : "bg-white"}`}>
      <div className={`text-2xl font-extrabold ${accent ? "text-white" : "text-brand-blue"}`}>{value}</div>
      <div className={`text-xs mt-1 ${accent ? "text-white/80" : "text-ink-500"}`}>{label}</div>
      {sub && <div className={`text-[10px] mt-1 ${accent ? "text-white/60" : "text-ink-400"}`}>{sub}</div>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats2"],
    queryFn: getAdminStats2,
    staleTime: 60_000,
  });

  if (stats.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><RoleGate page="/admin" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-8">
      <RoleGate page="/admin" />
      <PageHeader eyebrow="Admin" title="Overview" cover="/hero/checkout.jpg" />

      {/* KPI row */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active learners" value={s?.active_users.toLocaleString() ?? "-"} sub={`${s?.users.toLocaleString()} registered`} accent />
        <StatCard label="Tutors (approved)" value={s?.tutors_approved.toLocaleString() ?? "-"} sub={`${s?.tutors_pending.toLocaleString()} pending vetting`} />
        <StatCard label="Cohorts (published)" value={s?.cohorts_published.toLocaleString() ?? "-"} sub={`${s?.lessons_this_week.toLocaleString()} lessons this week`} />
        <StatCard label="Revenue" value={`â‚¦${(s?.revenue_in_escrow ?? 0).toLocaleString()}`} sub={`${(s?.revenue_paid_out ?? 0).toLocaleString()} paid out`} accent />
      </section>

      {/* Operational */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lessons today" value={s?.lessons_today.toLocaleString() ?? "-"} />
        <StatCard label="Pending enrolments" value={s?.pending_enrolments.toLocaleString() ?? "-"} />
        <StatCard label="Orders (total / paid)" value={`${s?.orders_total ?? 0}/${s?.orders_paid ?? 0}`} />
        <StatCard label="Blog published" value={s?.blog_published.toLocaleString() ?? "-"} sub={`${s?.blog_drafts.toLocaleString()} drafts`} />
      </section>

      {/* Attention needed */}
      {(s?.pending_enrolments ?? 0) > 0 || (s?.overdue_lesson_notes ?? 0) > 0 || (s?.support_open ?? 0) > 0 || (s?.escrow_disputed ?? 0) > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-800">Needs attention</h2>
          <ul className="mt-2 text-sm text-amber-800 list-disc pl-5 space-y-1">
            {s?.pending_enrolments ? <li>{s.pending_enrolments} pending enrollment(s) / payment exception(s)</li> : null}
            {s?.overdue_lesson_notes ? <li>{s.overdue_lesson_notes} completed lesson(s) missing tutor notes (QA alert)</li> : null}
            {s?.support_open ? <li><Link href="/admin/support" className="underline">{s.support_open} open support ticket(s)</Link></li> : null}
            {s?.escrow_disputed ? <li>{s.escrow_disputed} disputed escrow hold(s)</li> : null}
            {s?.pending_refunds ? <li>{s.pending_refunds} pending/failed order(s) awaiting review</li> : null}
          </ul>
        </section>
      ) : null}

      {/* Module quick links */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: "/admin/vetting", label: "Tutor vetting queue", desc: "Applications, documents, approvals" },
          { href: "/admin/cohorts", label: "Cohorts", desc: "Create, publish, manage capacity" },
          { href: "/admin/lessons", label: "Today's classes", desc: "Attendance & lesson overview" },
          { href: "/admin/support", label: "Support tickets", desc: "Resolve and escalate" },
          { href: "/admin/chat", label: "Chat agent inbox", desc: "Escalated conversations, replies, ratings" },
          { href: "/admin/payments", label: "Payments", desc: "Orders, confirmations, refunds, payouts" },
          { href: "/admin/reviews", label: "Review moderation", desc: "Consent-gated publishing" },
          { href: "/admin/blog", label: "Blog CMS", desc: "Publish study content" },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="border rounded-2xl p-5 hover:border-brand-blue hover:shadow-lift transition-all">
            <h3 className="font-bold text-sm">{m.label}</h3>
            <p className="text-xs text-ink-500 mt-1">{m.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
