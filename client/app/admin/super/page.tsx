"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats2 } from "@/features/admin/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
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
} from "lucide-react";

// Super Admin control center — SUPER_ADMIN only. Academic admins see a
// restricted notice; role grants are never self-serve (server-side only).

function Stat({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="text-2xl font-extrabold text-brand-navy">{value ?? "-"}</p>
      <p className="mt-0.5 text-xs font-semibold text-ink-500">{label}</p>
    </div>
  );
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
        <PageHeader eyebrow="Super admin" title="Restricted" cover="/hero/about.jpg" />
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-brand-navy">
            <Lock size={26} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-brand-navy">SUPER_ADMIN access only</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            This control center is restricted to SUPER_ADMIN. Academic admins can manage content, cohorts and
            operations from the admin console, but platform-level controls require the SUPER_ADMIN role.
          </p>
          <Link href="/admin" className="btn-primary mt-6 inline-block">
            Back to admin overview
          </Link>
        </div>
      </div>
    );
  }

  const s = stats.data;

  const modules = [
    { href: "/admin/users", label: "Users & roles", desc: "Staff view, role model", icon: Users },
    { href: "/admin/vetting", label: "Tutor vetting", desc: "Applications & approvals", icon: BadgeCheck },
    { href: "/admin/cohorts", label: "Cohorts", desc: "Create & publish cohorts", icon: CalendarDays },
    { href: "/admin/payments", label: "Payments", desc: "Orders, refunds, payouts", icon: Wallet },
    { href: "/admin/analytics", label: "Analytics", desc: "Platform analytics & reports", icon: BarChart3 },
    { href: "/admin/lessons", label: "Today's classes", desc: "Attendance & operations", icon: ClipboardCheck },
    { href: "/admin/support", label: "Support", desc: "Tickets & escalation", icon: LifeBuoy },
    { href: "/admin/blog", label: "Blog CMS", desc: "Publish study content", icon: Newspaper },
    { href: "/admin/institutions", label: "Institutions", desc: "B2B accounts", icon: Building2 },
    { href: "/admin/referrals", label: "Referrals", desc: "Rewards & tracking", icon: Gift },
    { href: "/admin/reviews", label: "Reviews", desc: "Consent-gated publishing", icon: Star },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Super admin" title="Platform control center" cover="/hero/about.jpg" />

      {/* Platform KPI snapshot */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered users" value={s?.users?.toLocaleString()} />
        <Stat label="Active users" value={s?.active_users?.toLocaleString()} />
        <Stat label="Approved tutors" value={s?.tutors_approved?.toLocaleString()} />
        <Stat label="Revenue in escrow" value={`₦${(s?.revenue_in_escrow ?? 0).toLocaleString()}`} />
        <Stat label="Cohorts published" value={s?.cohorts_published?.toLocaleString()} />
        <Stat label="Orders (total/paid)" value={`${s?.orders_total ?? 0}/${s?.orders_paid ?? 0}`} />
        <Stat label="Pending enrolments" value={s?.pending_enrolments?.toLocaleString()} />
        <Stat label="Open support" value={s?.support_open?.toLocaleString()} />
      </section>

      {/* Platform modules */}
      <section>
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-brand-navy">Platform modules</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition-all hover:border-brand-gold hover:shadow-lift"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gold-light text-brand-navy">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-brand-navy">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{m.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Role model */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-green" />
          <h2 className="font-display text-base font-bold text-brand-navy">Role model &amp; security</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li>· <b>SUPER_ADMIN</b> — full platform access, including this control center and role management (granted server-side only, never self-serve).</li>
          <li>· <b>ACADEMIC_ADMIN</b> — content, cohorts, operations; <b>not</b> platform role grants.</li>
          <li>· <b>INSTITUTION_ADMIN</b> — scoped to its own institution; never platform-wide.</li>
          <li>· Role assignments are enforced server-side on every admin route; the UI gate is cosmetic only.</li>
        </ul>
      </section>
    </div>
  );
}
