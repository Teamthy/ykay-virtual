# APPLY85.ps1 — role dashboard shells. Run from repo root.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\app')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path 'client\lib' | Out-Null
$content = @'
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarDays,
  MessageSquare,
  Bell,
  Settings,
  Wallet,
  Users,
  BadgeCheck,
  Newspaper,
  Building2,
  Gift,
  Star,
  LifeBuoy,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AppShellVariant = "parent" | "student" | "tutor" | "admin";

export const APP_NAV: Record<AppShellVariant, { title: string; home: string; items: AppNavItem[] }> = {
  parent: {
    title: "Parent portal",
    home: "/dashboard",
    items: [
      { href: "/dashboard", label: "Family dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "Learning", icon: GraduationCap },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  student: {
    title: "Student portal",
    home: "/student-dashboard",
    items: [
      { href: "/student-dashboard", label: "My dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "My learning", icon: BookOpen },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  tutor: {
    title: "Tutor workspace",
    home: "/tutor-dashboard",
    items: [
      { href: "/tutor-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms/tutor", label: "Teaching", icon: ClipboardCheck },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  admin: {
    title: "Admin console",
    home: "/admin",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/vetting", label: "Tutor vetting", icon: BadgeCheck },
      { href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
      { href: "/admin/lessons", label: "Today's classes", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/blog", label: "Blog CMS", icon: Newspaper },
      { href: "/admin/institutions", label: "Institutions", icon: Building2 },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
    ],
  },
};

export function variantForRoles(roles: string[]): AppShellVariant {
  if (roles.some((r) => r === "SUPER_ADMIN" || r === "ACADEMIC_ADMIN")) return "admin";
  if (roles.includes("TUTOR")) return "tutor";
  if (roles.includes("STUDENT")) return "student";
  return "parent";
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\lib\app-nav.ts'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/lib/app-nav.ts'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { cn } from "@/lib/utils";
import { APP_NAV, type AppShellVariant, variantForRoles } from "@/lib/app-nav";

// AppShell — one chrome system, four role layouts. Sidebar + top bar +
// content. Marketing header stays off these routes (ShellVisibility).

export function AppShell({
  children,
  variant: forced,
}: {
  children: React.ReactNode;
  variant?: AppShellVariant;
}) {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const variant = forced ?? variantForRoles(user?.roles ?? []);
  const spec = APP_NAV[variant];

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: unreadCount,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadN = unread.data ?? 0;
  const greeting = user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label={`${spec.title} navigation`}>
      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{spec.title}</p>
      {spec.items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-brand-gold text-ink-900" : "text-ink-700 hover:bg-ink-100"
            )}
          >
            <Icon size={16} className={active ? "text-ink-900" : "text-brand-navy"} />
            {item.label}
            {item.href === "/notifications" && unreadN > 0 && (
              <span className="ml-auto rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadN}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href={spec.home} className="font-display text-lg font-bold tracking-[0.1em] text-brand-navy">
              NUVORA
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/notifications"
              className="relative rounded-lg border border-ink-200 p-2.5 text-ink-600 hover:bg-ink-50"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadN > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-ink-900">
                  {unreadN}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-3 text-sm font-bold text-ink-800 hover:bg-ink-50 sm:pr-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-extrabold text-white">
                {greeting.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate sm:block">{isLoading ? "…" : greeting}</span>
            </Link>
            <Link
              href="/logout"
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut size={16} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1400px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-ink-100 bg-white p-4 lg:block">{nav}</aside>

        {open && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-ink-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-[min(280px,88vw)] overflow-y-auto bg-white p-4 shadow-lift">
              {nav}
            </aside>
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function RoleAwareShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\AppShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/AppShell.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

// Back-compat: pages that still wrap with DashboardShell get the role-aware
// chrome. Prefer a route layout (dashboard/student/tutor/admin/lms).

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\DashboardShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/DashboardShell.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\dashboard' | Out-Null
$content = @'
"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="parent">{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\dashboard\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/dashboard/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\student-dashboard' | Out-Null
$content = @'
"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="student">{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\student-dashboard\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/student-dashboard/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\tutor-dashboard' | Out-Null
$content = @'
"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="tutor">{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\tutor-dashboard\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/tutor-dashboard/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\lms' | Out-Null
$content = @'
"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default function LmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tutor = pathname.startsWith("/lms/tutor");
  return <AppShell variant={tutor ? "tutor" : undefined}>{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\lms\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/lms/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\messages' | Out-Null
$content = @'
"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\messages\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/messages/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\notifications' | Out-Null
$content = @'
"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\notifications\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/notifications/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\account' | Out-Null
$content = @'
"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\account\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/account/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\admin' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <main className="px-6 py-20 text-center text-ink-500">Loading admin console…</main>;
  }

  if (!user || !isAdmin(user)) {
    return (
      <main className="px-6 py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-navy">Admin access required</h1>
        <p className="mt-2 text-sm text-ink-500">You need an administrator account to view this console.</p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Log in as admin
        </Link>
      </main>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="px-4 py-8 md:px-8">{children}</div>
    </AppShell>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\admin\layout.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/admin/layout.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\dashboard' | Out-Null
$content = @'
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
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
} from "lucide-react";
import { unreadCount } from "@/features/messaging/api";
import { listProgressReports } from "@/features/learning/api";
import { createLearner, listLearners, type Learner } from "@/features/onboarding/api";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { getAttendanceSummary, getOrderReceipt, type OrderReceipt } from "@/features/portal/api";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", current_level: "", school_name: "" });
  const [section, setSection] = useState<(typeof NAV)[number]["key"]>("overview");
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

  const upcoming = all
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const nextLesson = upcoming[0];
  const nextPayment = (orders.data ?? []).find((o) => o.status === "PENDING");
  const paidCount = (orders.data ?? []).filter((o) => o.status === "PAID").length;

  return (
    <main className="px-4 py-8 md:px-8">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setSection(n.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  section === n.key ? "bg-brand-gold text-ink-900" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>
          <RoleGate page="/dashboard" />
          <RecommendationsForYou />

          <PageHeader
            eyebrow="Parent portal"
            title="Family dashboard"
            subline="Lessons, payments and progress for your family — in one place."
            actions={
              <label className="flex items-center gap-2 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Learner</span>
                <select
                  value={selectedLearner || activeLearner?.id || ""}
                  onChange={(e) => setSelectedLearner(e.target.value)}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/40 [&>option]:text-ink-900"
                >
                  {(learners.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                  ))}
                  {(learners.data ?? []).length === 0 && <option value="">Add a learner…</option>}
                </select>
              </label>
            }
          />

          {!learnerId && (
            <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue-light/60 p-6 text-sm">
              <strong className="text-brand-navy">No learner linked yet.</strong>{" "}
              <span className="text-ink-600">Add your first learner to see schedules, attendance and progress.</span>{" "}
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-brand-blue hover:underline">
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
                  <p className="text-sm font-bold text-ink-800">Payment pending — {nextPayment.order_number}</p>
                  <p className="text-xs text-ink-500">{nextPayment.currency} {nextPayment.total_amount.toLocaleString()} · completes your booking</p>
                </div>
              </div>
              <a href={nextPayment.checkout_cohort_id ? `/checkout/${nextPayment.checkout_cohort_id}` : "/cohorts"} className="rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-navy hover:bg-brand-gold-dark transition-colors">
                Complete payment
              </a>
            </div>
          )}

          {/* Section: Overview */}
          {section === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Upcoming lessons" value={upcoming.length} hint="scheduled or ongoing" icon={<CalendarDays size={18} />} />
                <StatCard label="Learners" value={(learners.data ?? []).length} hint="linked to your account" icon={<Users size={18} />} />
                <StatCard label="Paid orders" value={paidCount} hint="completed payments" icon={<Wallet size={18} />} />
                <StatCard
                  label="Attendance"
                  value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"}
                  hint={attendance.data ? `${attendance.data.present} present of ${attendance.data.total}` : "link a learner"}
                  icon={<LineChart size={18} />}
                />
              </div>

              {nextLesson ? (
                <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                        <CalendarDays size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Next lesson</p>
                        <p className="font-bold text-ink-800">{nextLesson.title}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(nextLesson.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {nextLesson.timezone}
                        </p>
                      </div>
                    </div>
                    {nextLesson.meeting_url && (
                      <a href={nextLesson.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-dark transition-colors">
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
                    <Link href="/private-tuition" className="rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover">
                      Book tuition
                    </Link>
                  }
                />
              )}
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
                        {r.strengths && <p className="mt-2 flex items-start gap-2 text-sm text-ink-600"><TrendingUp size={15} className="mt-0.5 shrink-0 text-brand-green" /> {r.strengths}</p>}
                        {r.weaknesses && <p className="mt-1 flex items-start gap-2 text-sm text-ink-600"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /> {r.weaknesses}</p>}
                        {r.recommendations && <p className="mt-1 flex items-start gap-2 text-sm text-ink-700"><Compass size={15} className="mt-0.5 shrink-0 text-brand-blue" /> {r.recommendations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Learners */}
          {section === "learners" && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-ink-800">Learners</h2>
                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-gold-hover"
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
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gold-light font-bold text-brand-navy">
                          {l.first_name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <p className="font-bold text-ink-800">{l.first_name} {l.last_name ?? ""}</p>
                          <p className="text-xs text-ink-500">
                            {l.current_level ?? "Level not set"}
                            {l.school_name ? ` · ${l.school_name}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedLearner(l.id); setSection("bookings"); }}
                        className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light transition-colors"
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
            className="mt-4 block rounded-2xl border border-ink-100 bg-white p-5 shadow-soft text-center text-sm font-bold text-brand-navy hover:border-brand-gold"
          >
            <span className="inline-flex items-center gap-2"><Settings size={16} /> Account settings</span>
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
                current_level: addForm.current_level.trim() || undefined,
                school_name: addForm.school_name.trim() || undefined,
                relationship: "PARENT",
              });
              await qc.invalidateQueries({ queryKey: ["onboarding", "learners"] });
              await qc.invalidateQueries({ queryKey: ["session", "context"] });
              setAddForm({ first_name: "", last_name: "", current_level: "", school_name: "" });
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
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">First name *</span>
              <input required value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">Last name *</span>
              <input required value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">Current level</span>
              <input placeholder="e.g. Year 7, JSS2, SSS3" value={addForm.current_level} onChange={(e) => setAddForm({ ...addForm, current_level: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">School (optional)</span>
              <input value={addForm.school_name} onChange={(e) => setAddForm({ ...addForm, school_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
          </div>
          {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>}
          <button type="submit" disabled={addSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-gold text-sm font-bold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:opacity-50">
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
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\student-dashboard' | Out-Null
$content = @'
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

// Student portal (working-doc §9): side nav, Today panel, progress,
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
      <PageHeader
        eyebrow="Student portal"
        title="Student dashboard"
        subline="Your classes, assignments and progress — in one place."
      />

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
                <StatCard label="Attendance" value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"} hint={`${attendance.data?.present ?? 0} present of ${attendance.data?.total ?? 0}`} icon={<LineChart size={18} />} />
                <StatCard label="Assignments" value={`${submittedIds.size}/${assignments.data?.length ?? 0}`} hint="submitted" icon={<FileText size={18} />} />
                <StatCard label="Lessons completed" value={past.length} hint="all time" icon={<CheckCircle2 size={18} />} />
              </div>

              {/* Today */}
              <section className="rounded-2xl bg-brand-blue text-white p-6">
                <h2 className="font-bold">Today&apos;s lessons</h2>
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
                            {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
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
                <h2 className="font-bold">Recent lessons & feedback</h2>
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
              <h2 className="font-bold text-lg">My classes</h2>
              <p className="text-xs text-ink-500 mt-1">Your cohort lessons — join links appear within the lesson window.</p>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-8 text-center">
                  No lessons yet — join a cohort to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(lessons.data ?? []).slice(0, 20).map((l) => (
                    <li key={l.id} className="border rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
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
              <p className="text-xs text-ink-500 mt-1">All times in your lesson timezone — clearly shown for cross-country learners.</p>
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
                            <span className="text-xs text-ink-500">{new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}</span>
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
                              {a.max_score ? ` · max ${a.max_score} pts` : ""}
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
                              placeholder="Write your answer…"
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
              <h2 className="font-bold text-lg">Progress summary</h2>
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
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\student-dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/student-dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\tutor-dashboard' | Out-Null
$content = @'
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
    { href: "/lms/tutor", label: "Teaching console", desc: "Roster, notes, grading", icon: BookOpen },
    { href: "/messages", label: "Messages", desc: "Parents & learners", icon: MessageSquare },
    { href: "/notifications", label: "Notifications", desc: "Reminders", icon: Bell },
    { href: "/contact", label: "Support", desc: "Get help", icon: LifeBuoy },
    { href: "/account", label: "Account settings", desc: "Profile & security", icon: Settings },
  ];

  return (
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/tutor-dashboard" />
      <RecommendationsForYou />
      <PageHeader
        eyebrow="Tutor workspace"
        title="Tutor dashboard"
        subline="Your application, schedule, attendance and earnings — all in one place."
        actions={
          <Link
            href="/lms/tutor"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
          >
            <BookOpen size={15} /> Teaching console
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

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Upcoming lessons" value={today.length} hint="scheduled or ongoing" icon={<CalendarDays size={18} />} />
            <StatCard label="Held (escrow)" value={`₦${(earnings.data?.held_total ?? 0).toLocaleString()}`} hint="awaiting delivery" icon={<Wallet size={18} />} />
            <StatCard label="Released" value={`₦${(earnings.data?.released_total ?? 0).toLocaleString()}`} hint="awaiting payout" icon={<ClipboardCheck size={18} />} />
            <StatCard label="Paid out" value={`₦${(earnings.data?.paid_total ?? 0).toLocaleString()}`} hint="total earnings" icon={<Wallet size={18} />} />
          </div>

          {/* Application status */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application status</h2>
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

          {/* Quick links */}
          <section>
            <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Quick links</h2>
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
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\tutor-dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/tutor-dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\lms' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { cn } from "@/lib/utils";
import {
  getMyLessons,
  getCohortLessons,
  getCohort,
  listMyAssignments,
  listMySubmissions,
  getAttendanceSummary,

} from "@/features/lms/api";
import { listAssessments, listProgressReports } from "@/features/learning/api";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { GraduationCap } from "lucide-react";

// Student LMS hub — my courses, attendance, assignments, quizzes, reports.

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-3xl font-extrabold text-brand-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-brand-navy">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function LmsHomePage() {
  // G1: profile IDs resolve from the session server-side (no fixture UUIDs).
  const { user, context } = useSession();
  const ready = !!user && !!context;

  const lessons = useQuery({ queryKey: ["lms", "my-lessons"], queryFn: () => getMyLessons(), enabled: ready });
  const attendance = useQuery({ queryKey: ["lms", "attendance"], queryFn: () => getAttendanceSummary(), enabled: ready });
  const assignments = useQuery({ queryKey: ["lms", "assignments"], queryFn: () => listMyAssignments(), enabled: ready });
  const submissions = useQuery({ queryKey: ["lms", "submissions"], queryFn: () => listMySubmissions(), enabled: ready });
  const quizzes = useQuery({ queryKey: ["lms", "quizzes"], queryFn: () => listAssessments(), enabled: ready });
  const reports = useQuery({ queryKey: ["lms", "reports"], queryFn: () => listProgressReports(), enabled: ready });

  const [cohortMeta, setCohortMeta] = React.useState<Record<string, { title: string; href: string }>>({});

  // Group lessons into courses (by cohort id), fetching cohort titles lazily.
  const courses = (() => {
    const map = new Map<string, NonNullable<typeof lessons.data>>();
    for (const l of lessons.data ?? []) {
      const cid = l.cohort_id ?? "none";
      const arr = map.get(cid) ?? [];
      arr.push(l);
      map.set(cid, arr);
    }
    return [...map.entries()].map(([cid, ls]) => ({ cohortId: cid, lessons: ls }));
  })();

  const loadCohort = async (cid: string) => {
    if (cid === "none" || cohortMeta[cid]) return;
    try {
      const c = await getCohort(cid);
      setCohortMeta((m) => ({ ...m, [cid]: { title: c.title, href: `/lms/courses/${c.id}` } }));
    } catch {
      setCohortMeta((m) => ({ ...m, [cid]: { title: "My course", href: "#" } }));
    }
  };
  courses.forEach((c) => void loadCohort(c.cohortId));

  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));
  const pending = (assignments.data ?? []).filter((a) => !submittedIds.has(a.id)).length;
  const graded = (submissions.data ?? []).filter((s) => s.score !== undefined).length;
  const passed = (quizzes.data ?? [])
    .filter((q) => q.status === "PASSED" || q.status === "GRADED")
    .length;

  return (
    <main className="pb-16">
      {/* Header */}
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">NUVORA</Link> / My learning
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">My Learning</h1>
              <p className="mt-1 text-sm text-ink-500">
                {user ? `Signed in as ${user.email}` : "Student portal"} — courses, assignments, quizzes and progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/cohorts" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
                Browse cohorts
              </Link>
              <Link href="/lms/tutor" className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Tutor view
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <RoleGate page="/lms" />
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active courses" value={courses.length || "—"} hint="Cohorts you're enrolled in" />
          <Stat label="Attendance" value={attendance.data ? `${attendance.data.rate}%` : "—"} hint="Across tracked lessons" />
          <Stat label="Assignments due" value={pending} hint={`${graded} graded so far`} />
          <Stat label="Quizzes passed" value={passed} hint="Auto-graded assessments" />
        </div>

        {/* Courses */}
        <Section title="My courses" action={<Link href="/cohorts" className="text-sm font-semibold text-brand-gold-dark hover:underline">View all →</Link>}>
          {lessons.isLoading ? (
            <p className="py-8 text-center text-sm text-ink-400">Loading your courses…</p>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <GraduationCap size={28} className="text-brand-navy" />
              <p className="mt-2 font-semibold text-ink-700">You're not enrolled in any course yet.</p>
              <p className="mt-1 text-sm text-ink-500">Explore programmes and join a cohort to get started.</p>
              <Link href="/programmes" className="mt-4 inline-flex rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Browse programmes
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((c) => {
                const meta = cohortMeta[c.cohortId] ?? { title: "My course", href: `/lms/courses/${c.cohortId}` };
                const next = c.lessons[0];
                return (
                  <Link
                    key={c.cohortId}
                    href={meta.href}
                    className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-brand-navy group-hover:text-brand-gold-dark">{meta.title}</h3>
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-navy">
                        {c.lessons.length} lessons
                      </span>
                    </div>
                    {next && (
                      <p className="mt-2 text-sm text-ink-500">
                        Next: <span className="font-semibold text-ink-700">{next.title}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-400">Open course →</p>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* Assignments */}
        <Section title="Assignments" action={<Link href="/lms" className="text-sm font-semibold text-brand-gold-dark hover:underline">Manage →</Link>}>
          {assignments.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
          ) : (assignments.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">No assignments yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
              {(assignments.data ?? []).map((a) => {
                const sub = (submissions.data ?? []).find((s) => s.assignment_id === a.id);
                return (
                  <div
                    key={a.id}
                    className="flex w-full items-center justify-between gap-4 border-b border-ink-100 px-5 py-4 text-left last:border-0 hover:bg-[#F8EBCF]"
                  >
                    <div>
                      <p className="font-semibold text-ink-800">{a.title}</p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No deadline"}
                        {a.max_score ? ` · Max ${a.max_score} pts` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                        sub?.score !== undefined
                          ? "bg-green-100 text-green-700"
                          : sub
                          ? "bg-brand-gold-light text-brand-navy"
                          : "bg-ink-100 text-ink-500"
                      )}
                    >
                      {sub?.score !== undefined ? `${sub.score}/${a.max_score ?? "—"} graded` : sub ? "Submitted" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent reports */}
        <Section title="Progress reports">
          {(reports.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
              No progress reports yet — your tutor will share them here.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(reports.data ?? []).map((r) => (
                <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-700">
                      {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    </p>
                    <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                      ★ {r.overall_rating}/5
                    </span>
                  </div>
                  {r.strengths && <p className="mt-2 text-sm text-ink-600">💪 {r.strengths}</p>}
                  {r.recommendations && <p className="mt-1 text-sm text-ink-600">🎯 {r.recommendations}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\lms\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/lms/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\messages' | Out-Null
$content = @'
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MessageCenter } from "@/features/messaging/components/MessageCenter";


export const metadata: Metadata = buildMetadata({
  title: "Messages",
  description: "Booking-scoped conversations with your tutors and cohort peers.",
  path: "/messages",
  noIndex: true,
});

export default function MessagesPage() {
  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">Messages</h1>
        <p className="text-ink-500 text-sm mt-1">
          Conversations are scoped to your bookings — tutors, parents and cohort members only.
        </p>
      </div>
      <MessageCenter />
    </main>

  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\messages\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/messages/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\notifications' | Out-Null
$content = @'
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loginWithReturn } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Inbox } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/messaging/api";
import { useSession } from "@/hooks/useSession";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user, isLoading } = useSession();
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  const notifs = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => listNotifications(),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (notifs.data?.data ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Notifications</h1>
          <p className="text-ink-500 text-sm mt-1">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        )}
      </div>

      {notifs.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (notifs.data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title="No notifications yet"
          description="Booking updates, messages and payment events will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {(notifs.data?.data ?? []).map((n) => (
            <li key={n.id}>
              <Card
                className={
                  n.is_read
                    ? "px-5 py-4"
                    : "cursor-pointer border-brand-blue/30 bg-brand-blue-light/50 px-5 py-4 transition-colors hover:bg-brand-blue-light/80"
                }
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-ink-200" : "bg-brand-blue"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-ink-800">{n.title}</span>
                    {!n.is_read && <StatusBadge label="New" kind="info" />}
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {n.body ? <p className="mt-1 pl-[18px] text-sm text-ink-600">{n.body}</p> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
    </DashboardShell>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\notifications\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/notifications/page.tsx'

Write-Host 'Done. git add those files, commit, push. Do not add APPLY85.ps1.'
