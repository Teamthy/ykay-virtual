"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { homeForRoles } from "@/hooks/useDashboardRoute";
import { cn } from "@/lib/utils";
import { clearOnboardingDraft } from "@/lib/onboarding";
import { logout as apiLogout } from "@/features/auth/api";

// DashboardShell — the personalized app chrome for every authenticated
// surface. NO marketing nav: a compact brand, the session user's first
// name, role-aware navigation, a live unread badge and logout.

const ROLE_NAV: Record<string, { label: string; href: string }[]> = {
  PARENT: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Learning", href: "/lms" },
    { label: "Notifications", href: "/notifications" },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student-dashboard" },
    { label: "My Learning", href: "/lms" },
    { label: "Notifications", href: "/notifications" },
  ],
  TUTOR: [
    { label: "Dashboard", href: "/tutor-dashboard" },
    { label: "Teaching", href: "/lms/tutor" },
    { label: "Notifications", href: "/notifications" },
  ],
  ADMIN: [{ label: "Admin", href: "/admin" }],
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: unreadCount,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadN = unread.data ?? 0;

  const primaryRole = (user?.roles ?? []).find((r) => ROLE_NAV[r]) ?? "";
  const nav = primaryRole ? ROLE_NAV[primaryRole] : [];
  const greeting = user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const logout = () => {
    // A-27: revoke the session server-side (fire-and-forget — the same
    // revocation as the header logout), clear the onboarding draft so the
    // next user starts fresh, then drop the cookie and reload.
    void apiLogout().catch(() => {});
    clearOnboardingDraft();
    document.cookie = "nuvora_session=; Max-Age=0; path=/";
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href={homeForRoles(user?.roles ?? [])} className="font-display text-lg font-bold tracking-[0.1em] text-brand-navy">
              NUVORA
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Account navigation">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-brand-gold/15 text-brand-navy"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-4 text-sm font-bold text-ink-800 hover:bg-ink-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-extrabold text-white">
                {greeting.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate sm:block">{greeting}</span>
            </Link>
            <button
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
