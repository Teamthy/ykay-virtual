"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAdminOverview } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { DashHero } from "@/components/dashboard/DashHero";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Gift,
  History,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Newspaper,
  Star,
  UserPlus,
  Wallet,
} from "lucide-react";

// Admin dashboard (operational overview): KPI cards, needs-attention panel,
// quick actions and module links — the day-to-day operations home for
// ACADEMIC_ADMIN / SUPER_ADMIN. (User/role and super-admin details are hidden
// from non-SUPER_ADMIN; see /admin/users.)

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${accent ? "bg-deep text-white border-deep" : "bg-white"}`}
    >
      <div
        className={`text-2xl font-extrabold ${accent ? "text-white" : "text-deep"}`}
      >
        {value}
      </div>
      <div
        className={`text-xs mt-1 ${accent ? "text-white/80" : "text-ink-500"}`}
      >
        {label}
      </div>
      {sub && (
        <div
          className={`text-[10px] mt-1 ${accent ? "text-white/60" : "text-ink-400"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function fmtNGN(n?: number) {
  return `₦${(n ?? 0).toLocaleString()}`;
}

export default function AdminOverviewPage() {
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (overview.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RoleGate page="/admin" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const o = overview.data;
  const s = o?.stats;

  const attention: {
    label: string;
    href: string;
    count?: number;
    warn: boolean;
  }[] = [
    {
      label: "Tutor applications",
      href: "/admin/vetting",
      count: s?.tutors_pending,
      warn: (s?.tutors_pending ?? 0) > 0,
    },
    {
      label: "Pending enrolments",
      href: "/admin/cohorts",
      count: s?.pending_enrolments,
      warn: (s?.pending_enrolments ?? 0) > 0,
    },
    {
      label: "Overdue lesson notes",
      href: "/admin/lessons",
      count: s?.overdue_lesson_notes,
      warn: (s?.overdue_lesson_notes ?? 0) > 0,
    },
    {
      label: "Disputed escrow",
      href: "/admin/payments",
      count: s?.escrow_disputed,
      warn: (s?.escrow_disputed ?? 0) > 0,
    },
    {
      label: "Open support",
      href: "/admin/support",
      count: s?.support_open,
      warn: (s?.support_open ?? 0) > 0,
    },
    {
      label: "Pending refunds",
      href: "/admin/payments",
      count: s?.pending_refunds,
      warn: (s?.pending_refunds ?? 0) > 0,
    },
    {
      label: "Reviews to moderate",
      href: "/admin/reviews",
      count: s?.reviews_pending,
      warn: (s?.reviews_pending ?? 0) > 0,
    },
    {
      label: "Cohort join requests",
      href: "/admin/cohorts",
      count: o?.joins_pending,
      warn: (o?.joins_pending ?? 0) > 0,
    },
    {
      label: "Open support tickets",
      href: "/admin/support",
      count: o?.tickets_open,
      warn: (o?.tickets_open ?? 0) > 0,
    },
  ].filter((a) => (a.count ?? 0) > 0);

  const quickActions = [
    {
      href: "/admin/cohorts",
      label: "Create a cohort",
      desc: "Publish a new class",
      icon: CalendarDays,
    },
    {
      href: "/admin/vetting",
      label: "Review tutors",
      desc: `${s?.tutors_pending ?? 0} awaiting approval`,
      icon: BadgeCheck,
    },
    {
      href: "/admin/blog",
      label: "Write a post",
      desc: "Publish study content",
      icon: Newspaper,
    },
    {
      href: "/admin/payments",
      label: "Payments",
      desc: "Confirm, refund, payouts",
      icon: Wallet,
    },
  ];

  const modules = [
    {
      href: "/admin/vetting",
      label: "Tutor vetting",
      desc: "Applications & approvals",
      icon: BadgeCheck,
    },
    {
      href: "/admin/cohorts",
      label: "Cohorts",
      desc: "Create, publish, manage",
      icon: CalendarDays,
    },
    {
      href: "/admin/lessons",
      label: "Today's classes",
      desc: "Attendance & overview",
      icon: ClipboardCheck,
    },
    {
      href: "/admin/payments",
      label: "Payments",
      desc: "Orders, refunds, payouts",
      icon: Wallet,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      desc: "Platform analytics",
      icon: BarChart3,
    },
    {
      href: "/admin/support",
      label: "Support",
      desc: "Tickets & escalation",
      icon: LifeBuoy,
    },
    {
      href: "/admin/chat",
      label: "Chat agent inbox",
      desc: "Escalated conversations",
      icon: MessageSquare,
    },
    {
      href: "/admin/blog",
      label: "Blog CMS",
      desc: "Publish study content",
      icon: Newspaper,
    },
    {
      href: "/admin/institutions",
      label: "Institutions",
      desc: "B2B accounts",
      icon: Building2,
    },
    {
      href: "/admin/referrals",
      label: "Referrals",
      desc: "Rewards & tracking",
      icon: Gift,
    },
    {
      href: "/admin/reviews",
      label: "Reviews",
      desc: "Consent-gated publishing",
      icon: Star,
    },    {
      href: "/admin/cbt",
      label: "CBT bank",
      desc: "2,000+ practice questions",
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <RoleGate page="/admin" />
      <DashHero
        icon={<LayoutDashboard size={20} />}
        kicker="Operations"
        title="Platform overview"
        body={`${s?.active_users?.toLocaleString() ?? "—"} active learners · ${s?.tutors_pending ?? 0} tutors awaiting review · ${s?.support_open ?? 0} open tickets.`}
        chipTitle={`${s?.lessons_today ?? 0} classes`}
        chipHint="Today"
        ctaHref="/admin/vetting"
        ctaLabel="Review queue"
      />

      {/* KPI row */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active learners"
          value={s?.active_users.toLocaleString() ?? "-"}
          sub={`${s?.users.toLocaleString()} registered`}
          accent
        />
        <StatCard
          label="Tutors (approved)"
          value={s?.tutors_approved.toLocaleString() ?? "-"}
          sub={`${s?.tutors_total?.toLocaleString()} total · ${s?.tutors_pending.toLocaleString()} pending`}
        />
        <StatCard
          label="Cohorts (published)"
          value={s?.cohorts_published.toLocaleString() ?? "-"}
          sub={`${s?.lessons_this_week.toLocaleString()} lessons this week`}
        />
        <StatCard
          label="Revenue"
          value={fmtNGN(s?.revenue_in_escrow)}
          sub={`${fmtNGN(s?.revenue_paid_out)} paid out`}
          accent
        />
      </section>

      {/* Operational */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Lessons today"
          value={s?.lessons_today.toLocaleString() ?? "-"}
        />
        <StatCard
          label="Pending enrolments"
          value={s?.pending_enrolments.toLocaleString() ?? "-"}
        />
        <StatCard
          label="Orders (total / paid)"
          value={`${s?.orders_total ?? 0}/${s?.orders_paid ?? 0}`}
        />
        <StatCard
          label="Blog published"
          value={s?.blog_published.toLocaleString() ?? "-"}
          sub={`${s?.blog_drafts.toLocaleString()} drafts`}
        />
        <StatCard
          label="Institutions"
          value={s?.institutions?.toLocaleString() ?? "-"}
          sub="B2B accounts"
        />
        <StatCard
          label="Referrals"
          value={s?.referrals?.toLocaleString() ?? "-"}
          sub="Programme referrals"
        />
        <StatCard
          label="Reviews pending"
          value={s?.reviews_pending?.toLocaleString() ?? "-"}
          sub="Moderation queue"
        />
        <StatCard
          label="Escrow disputed"
          value={s?.escrow_disputed?.toLocaleString() ?? "-"}
          sub="Needs review"
        />
      </section>

      {/* Growth + money in flight */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="New leads"
          value={String(o?.leads_new ?? 0)}
          sub={`${o?.leads_total ?? 0} total captured`}
          accent
        />
        <StatCard
          label="Payouts pending"
          value={fmtNGN(o?.payouts_pending_total)}
          sub="Tutor bank transfers"
        />
        <StatCard
          label="Tutor applications"
          value={String(o?.vetting_submitted ?? 0)}
          sub="Awaiting review"
        />
        <StatCard
          label="Open support"
          value={String(o?.tickets_open ?? 0)}
          sub="Active tickets"
        />
      </section>

      {/* Today's classes */}
      {((o?.lessons_today ?? []).length ?? 0) > 0 && (
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 font-bold text-deep">
            <CalendarDays size={16} className="text-primary" /> Today&apos;s
            classes
          </h2>
          <ul className="mt-3 divide-y divide-ink-50">
            {(o?.lessons_today ?? []).slice(0, 6).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-ink-800">{l.title}</span>
                <span className="text-xs text-ink-500">
                  {new Date(l.start_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent activity */}
      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-bold text-deep">
          <History size={16} className="text-primary" /> Recent activity
        </h2>
        {(o?.recent_audit ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-400">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-50">
            {(o?.recent_audit ?? []).slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="text-ink-700">
                  <span className="font-bold">
                    {String(a.action ?? "").replace(/_/g, " ")}
                  </span>
                  <span className="text-ink-500">
                    {" "}
                    · {a.target_type ?? "platform"}
                  </span>
                </span>
                <span className="text-xs text-ink-400">
                  {new Date(a.created_at).toLocaleString([], {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Attention needed */}
      {attention.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-700" />
            <h2 className="font-bold text-amber-800">Needs attention</h2>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm hover:bg-white"
              >
                <span className="font-semibold text-amber-900">{a.label}</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${a.warn ? "bg-amber-600 text-white" : "bg-ink-100 text-ink-600"}`}
                >
                  {a.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-deep">
          Quick actions
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="group flex items-start justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-4 transition-all hover:border-deep hover:shadow-lift"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-deep/10 text-deep">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-deep">{a.label}</p>
                    <p className="text-xs text-ink-500">{a.desc}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="mt-1 shrink-0 text-ink-600 transition-colors group-hover:text-deep"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Module quick links */}
      <section>
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-deep">
          Operations modules
        </h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition-all hover:border-deep hover:shadow-lift"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-deep/10 text-deep">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-deep">
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {m.desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <UserPlus size={13} /> Non-super-admin accounts can review users but
        cannot see SUPER_ADMIN accounts or grant roles.
      </p>
    </div>
  );
}
