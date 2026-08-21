"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { cn } from "@/lib/utils";
import { APP_NAV, type AppNavItem, type AppShellVariant, variantForRoles } from "@/lib/app-nav";
import { LogoutDialog } from "@/components/layout/LogoutDialog";
import { Logo } from "@/components/layout/Logo";

// AppShell — Incubator-style frame (full-height sidebar + greeting header)
// with NUVORA brand: deep green, neon gold, peach surfaces.

function greetingWord(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function NavList({
  items,
  pathname,
  userRoles,
  unreadN,
  onNavigate,
}: {
  items: AppNavItem[];
  pathname: string;
  userRoles: string[];
  unreadN: number;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items
        .filter((item) => !item.superAdminOnly || userRoles.includes("SUPER_ADMIN"))
        .map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-deep text-white" : "text-ink-700 hover:bg-ink-50"
              )}
            >
              <Icon size={16} className={active ? "text-primary" : "text-ink-500"} />
              {item.label}
              {item.href === "/notifications" && unreadN > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-ink-900">
                  {unreadN}
                </span>
              )}
            </Link>
          );
        })}
    </div>
  );
}

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
  const name = user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const sidebar = (
    <>
      <Link href={spec.home} className="block px-5 pb-4 pt-6" onClick={() => setOpen(false)}>
        <Logo markClassName="size-8" />
      </Link>
      <div className="mx-4 mb-6 rounded-xl bg-primary-light px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-deep/70">Enrolled as</p>
        <p className="text-sm font-bold text-deep">{spec.chip}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-3 pb-6" aria-label={`${spec.title} navigation`}>
        <div>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">Main</p>
          <NavList items={spec.main} pathname={pathname} userRoles={user?.roles ?? []} unreadN={unreadN} onNavigate={() => setOpen(false)} />
        </div>
        <div>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">More</p>
          <NavList items={spec.more} pathname={pathname} userRoles={user?.roles ?? []} unreadN={unreadN} onNavigate={() => setOpen(false)} />
        </div>
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-[#07140e]">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-ink-100 bg-white dark:border-[#214c37] dark:bg-[#0d1f16] lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-ink-100 bg-white px-4 dark:border-[#214c37] dark:bg-[#0d1f16]/95 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink-900 md:text-xl">
                {greetingWord()}, {isLoading ? "…" : name}
              </h1>
              <p className="hidden truncate text-sm text-ink-500 sm:block">{spec.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-full border border-ink-200 p-2.5 text-ink-600 hover:bg-ink-50"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadN > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-ink-900">
                  {unreadN}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-deep text-sm font-bold text-white ring-2 ring-white"
              title={user?.email}
            >
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label="Log out"
              title="Log out"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:bg-ink-100 hover:text-ink-900 sm:flex"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-ink-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-[min(280px,88vw)] flex-col overflow-y-auto bg-white shadow-lift">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

export function RoleAwareShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
