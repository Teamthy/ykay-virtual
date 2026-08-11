"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import {
  LayoutDashboard,
  BadgeCheck,
  Newspaper,
  Building2,
  Gift,
  Star,
  CalendarDays,
  Users,
  LifeBuoy,
  BarChart3,
  LogOut,
} from "lucide-react";

// Admin console shell — sidebar nav + admin-gate.
const NAV = [
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
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <main className="container-x py-20 text-center text-ink-500">Loading admin console…</main>
    );
  }

  if (!user || !isAdmin(user)) {
    return (
      <main className="container-x py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-extrabold mt-4">Admin access required</h1>
        <p className="text-ink-500 mt-2 text-sm">
          You need an administrator account to view this console.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Log in as admin
        </Link>
      </main>
    );
  }

  return (
    <div className="container-x py-10 grid lg:grid-cols-[240px_1fr] gap-8 items-start">
      <aside className="lg:sticky lg:top-28 border rounded-2xl p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
          Admin console
        </p>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-brand-blue text-white" : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
        <div className="border-t border-ink-100 mt-2 pt-2">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-500 hover:bg-ink-50">
            <LogOut size={16} />
            Back to site
          </Link>
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
