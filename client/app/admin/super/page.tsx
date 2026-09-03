"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats2 } from "@/features/admin/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { DashHero } from "@/components/dashboard/DashHero";
import {
  Mail,
  ShieldCheck,
  Users,
  BadgeCheck,
  CalendarDays,
  Wallet,
  Newspaper,
  Building2,
  Gift,
  Star,
  LifeBuoy,
  BarChart3,
  ClipboardCheck,
  Lock,
  ArrowUpRight,
  AlertTriangle,
  UserPlus,
  BookOpen,
  TrendingUp,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  getAdminOverview,
  sendAdminTestEmail,
  listAuditLogs,
} from "@/features/admin/api";
import { toast } from "sonner";

// Super Admin control center — SUPER_ADMIN only. Academic admins see a
// restricted notice; role grants are never self-serve (server-side only).

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="text-2xl font-extrabold text-deep">{value ?? "-"}</p>
      <p className="mt-0.5 text-xs font-semibold text-ink-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

function fmtNGN(n?: number) {
  return `₦${(n ?? 0).toLocaleString()}`;
}

export default function SuperAdminPage() {
  const { user, isLoading } = useSession();
  const superAdmin = !!user?.roles?.includes("SUPER_ADMIN");

  const stats = useQuery({
    queryKey: ["admin", "stats2"],
    queryFn: getAdminStats2,
    enabled: !!user && superAdmin,
    staleTime: 60_000,
  });

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    enabled: !!user && superAdmin,
    staleTime: 30_000,
  });

  const testEmail = async () => {
    try {
      const res = await sendAdminTestEmail();
      toast.success(`Test email sent to ${res.to} via ${res.provider}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send test email");
    }
  };

  const auditLogs = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => listAuditLogs({ limit: 20 }),
    enabled: !!user && superAdmin,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!superAdmin) {
    return (
      <div className="space-y-6">
        <DashHero
          icon={<Lock size={20} />}
          kicker="Super admin"
          title="Restricted"
          body="This control centre is SUPER_ADMIN only."
          chipTitle="Locked"
          chipHint="Access"
        />
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-deep">
            <Lock size={26} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-deep">
            SUPER_ADMIN access only
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            This control center is restricted to SUPER_ADMIN. Academic admins
            can manage content, cohorts and operations from the admin console,
            but platform-level controls require the SUPER_ADMIN role.
          </p>
          <Link href="/admin" className="btn-primary mt-6 inline-block">
            Back to admin overview
          </Link>
        </div>
      </div>
    );
  }

  const s = stats.data;

  // Attention items derived from live stats — surfaced on the super dashboard.
  const attention: {
    label: string;
    href?: string;
    count?: number;
    warn: boolean;
  }[] = [
    {
      label: "Pending tutor applications",
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
      label: "Open support tickets",
      href: "/admin/support",
      count: s?.support_open,
      warn: (s?.support_open ?? 0) > 0,
    },
    {
      label: "Disputed escrow holds",
      href: "/admin/payments",
      count: s?.escrow_disputed,
      warn: (s?.escrow_disputed ?? 0) > 0,
    },
    {
      label: "Pending refunds",
      href: "/admin/payments",
      count: s?.pending_refunds,
      warn: (s?.pending_refunds ?? 0) > 0,
    },
    {
      label: "Overdue lesson notes",
      href: "/admin/lessons",
      count: s?.overdue_lesson_notes,
      warn: (s?.overdue_lesson_notes ?? 0) > 0,
    },
    {
      label: "Reviews awaiting moderation",
      href: "/admin/reviews",
      count: s?.reviews_pending,
      warn: (s?.reviews_pending ?? 0) > 0,
    },
  ].filter((a) => a.count);

  const modules = [
    {
      href: "/admin/users",
      label: "Users & roles",
      desc: "Search accounts, roles, status",
      icon: Users,
    },
    {
      href: "/admin/vetting",
      label: "Tutor vetting",
      desc: "Applications & approvals",
      icon: BadgeCheck,
    },
    {
      href: "/admin/cohorts",
      label: "Cohorts",
      desc: "Create & publish cohorts",
      icon: CalendarDays,
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
      desc: "Platform analytics & reports",
      icon: BarChart3,
    },
    {
      href: "/admin/lessons",
      label: "Today's classes",
      desc: "Attendance & operations",
      icon: ClipboardCheck,
    },
    {
      href: "/admin/support",
      label: "Support",
      desc: "Tickets & escalation",
      icon: LifeBuoy,
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
    },
  ];

  const quickActions = [
    {
      href: "/admin/users",
      label: "Add / manage admins",
      desc: "Grant SUPER_ADMIN or ACADEMIC_ADMIN",
      icon: UserPlus,
    },
    {
      href: "/admin/cohorts",
      label: "Create a cohort",
      desc: "Publish a new scheduled class",
      icon: BookOpen,
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
  ];

  const revenueGrowth = (s?.revenue_paid_out ?? 0) > 0;

  return (
    <div className="space-y-8">
      <DashHero
        icon={<ShieldCheck size={20} />}
        kicker="Super admin"
        title="Platform control centre"
        body={`${s?.users?.toLocaleString() ?? "—"} users · ${s?.tutors_pending ?? 0} tutors pending · ${fmtNGN(s?.revenue_in_escrow)} in escrow.`}
        chipTitle="Live"
        chipHint="Control"
        ctaHref="/admin/users"
        ctaLabel="Manage users"
      />

      {/* Platform KPI snapshot */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Registered users"
          value={s?.users?.toLocaleString()}
          hint={`${(s?.active_users ?? 0).toLocaleString()} active`}
        />
        <Stat
          label="Tutors"
          value={s?.tutors_approved?.toLocaleString()}
          hint={`${(s?.tutors_total ?? 0).toLocaleString()} total · ${(s?.tutors_pending ?? 0).toLocaleString()} pending`}
        />
        <Stat
          label="Cohorts published"
          value={s?.cohorts_published?.toLocaleString()}
          hint={`${s?.lessons_today ?? 0} lessons today`}
        />
        <Stat
          label="Revenue (escrow)"
          value={fmtNGN(s?.revenue_in_escrow)}
          hint={`${fmtNGN(s?.revenue_paid_out)} paid out`}
        />
        <Stat
          label="Orders"
          value={`${s?.orders_total ?? 0}`}
          hint={`${s?.orders_paid ?? 0} paid`}
        />
        <Stat
          label="Pending enrolments"
          value={s?.pending_enrolments?.toLocaleString()}
          hint="Awaiting payment/confirmation"
        />
        <Stat
          label="Institutions"
          value={s?.institutions?.toLocaleString()}
          hint="B2B accounts"
        />
        <Stat
          label="Referrals issued"
          value={s?.referrals?.toLocaleString()}
          hint="Programme referrals"
        />
        <Stat
          label="Blog posts"
          value={s?.blog_published?.toLocaleString()}
          hint={`${s?.blog_drafts?.toLocaleString()} drafts`}
        />
        <Stat
          label="Reviews pending"
          value={s?.reviews_pending?.toLocaleString()}
          hint="Consent-gated moderation"
        />
        <Stat
          label="Escrow disputed"
          value={s?.escrow_disputed?.toLocaleString()}
          hint="Needs review"
        />
        <Stat
          label="Open support"
          value={s?.support_open?.toLocaleString()}
          hint="Awaiting response"
        />
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
                href={a.href ?? "/admin"}
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
                className="group flex items-start justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-4 transition-all hover:border-primary hover:shadow-lift"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-deep">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-deep">{a.label}</p>
                    <p className="text-xs text-ink-500">{a.desc}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="mt-1 shrink-0 text-ink-600 transition-colors group-hover:text-primary"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Platform modules */}
      <section>
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-deep">
          Platform modules
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition-all hover:border-primary hover:shadow-lift"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-deep">
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

      {/* Recent audit trail */}
      <section className="rounded-2xl border border-ink-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            <h2 className="font-display text-base font-bold text-deep">
              Recent audit trail
            </h2>
          </div>
          <Link
            href="/admin/users"
            className="text-xs font-bold text-deep hover:underline"
          >
            Manage users →
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-ink-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-[11px] uppercase tracking-[0.12em] text-ink-500">
              <tr>
                <th className="px-3 py-2 font-bold">When</th>
                <th className="px-3 py-2 font-bold">Action</th>
                <th className="px-3 py-2 font-bold">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(auditLogs.data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-500">
                    {a.created_at
                      ? new Date(a.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-700">
                      <ShieldAlert size={11} /> {a.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-600">
                    {a.target_type}
                    {a.target_id ? ` · ${a.target_id.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
              {(auditLogs.data ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-xs text-ink-500"
                  >
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          Super-admin visible only. Logs money, access and role/status changes.
        </p>
      </section>

      {/* Revenue / growth note */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-display text-base font-bold text-deep">
              Revenue position
            </h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-500">
                In escrow (not yet paid to tutors)
              </p>
              <p className="text-xl font-extrabold text-deep">
                {fmtNGN(s?.revenue_in_escrow)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Paid out to tutors</p>
              <p className="text-xl font-extrabold text-primary">
                {fmtNGN(s?.revenue_paid_out)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            {revenueGrowth
              ? "Escrow holds represent committed revenue that releases to tutors after delivery."
              : "No paid-out revenue yet — escrow auto-releases on the weekly payout cycle."}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <h2 className="font-display text-base font-bold text-deep">
              Role model &amp; security
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              · <b>SUPER_ADMIN</b> — full platform access, incl. role management
              (server-side only).
            </li>
            <li>
              · <b>ACADEMIC_ADMIN</b> — content, cohorts, operations; can view
              users but not grant roles.
            </li>
            <li>
              · <b>INSTITUTION_ADMIN</b> — scoped to its own institution; never
              platform-wide.
            </li>
            <li>
              · Role/status changes are enforced server-side; you can't remove
              the last SUPER_ADMIN or suspend yourself.
            </li>
          </ul>
        </div>
      </section>

      {/* Conversion funnel */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="New leads"
          value={overview.data?.leads_new}
          hint={`${overview.data?.leads_total ?? 0} captured total`}
        />
        <Stat
          label="Payouts pending"
          value={fmtNGN(overview.data?.payouts_pending_total)}
          hint="tutor bank transfers"
        />
        <Stat
          label="Attention queues"
          value={
            (overview.data?.vetting_submitted ?? 0) +
            (overview.data?.joins_pending ?? 0) +
            (overview.data?.tickets_open ?? 0)
          }
          hint="vetting + joins + tickets"
        />
      </section>

      {/* Email delivery check */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            <h2 className="font-display text-base font-bold text-deep">
              Email delivery check
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void testEmail()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-ink-900 hover:bg-primary-hover"
          >
            Send test email to myself
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-600">
          Verifies Resend/SMTP end to end — the API log also prints the active
          provider at boot (<code>email provider active</code>). If this test
          doesn&apos;t arrive, login codes and receipts aren&apos;t either.
        </p>
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-base font-bold text-deep">
          Recent platform activity
        </h2>
        {(overview.data?.recent_audit ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-400">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-50">
            {(overview.data?.recent_audit ?? []).slice(0, 8).map((a) => (
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
    </div>
  );
}
