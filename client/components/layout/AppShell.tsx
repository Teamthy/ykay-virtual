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
import { LogoutDialog } from "@/components/layout/LogoutDialog";

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
  const [logoutOpen, setLogoutOpen] = useState(false);
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
      {spec.items
        .filter((item) => !item.superAdminOnly || user?.roles?.includes("SUPER_ADMIN"))
        .map((item) => {
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
    <div
      className="min-h-screen bg-surface-muted bg-cover bg-fixed bg-center dark:bg-[#07140e]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,247,228,0.92) 0%, rgba(248,235,207,0.94) 100%), url(/hero/about.jpg)",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur dark:border-[#214c37] dark:bg-[#0d1f16]/95">
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
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut size={16} />
            </button>
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
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

export function RoleAwareShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
