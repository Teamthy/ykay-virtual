"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X, ArrowRight } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { cn } from "@/lib/utils";
import {
  APP_NAV,
  type AppNavItem,
  type AppShellVariant,
  variantForRoles,
} from "@/lib/app-nav";
import { LogoutDialog } from "@/components/layout/LogoutDialog";
import { Logo } from "@/components/layout/Logo";

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
    <div className="flex flex-col gap-1">
      {items
        .filter(
          (item) => !item.superAdminOnly || userRoles.includes("SUPER_ADMIN"),
        )
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
                "group flex items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-bold transition-all",
                active
                  ? "bg-[#D6FF57] text-[#0F2A1A] shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full transition",
                  active
                    ? "bg-[#0F2A1A] text-[#D6FF57]"
                    : "bg-white/10 text-white/70 group-hover:bg-white/15 group-hover:text-white",
                )}
              >
                <Icon size={14} />
              </span>
              {item.label}
              {item.href === "/notifications" && unreadN > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                    active ? "bg-[#0F2A1A] text-white" : "bg-[#D6FF57] text-[#0F2A1A]",
                  )}
                >
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
  const name =
    user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href={spec.home} className="block px-6 pb-4 pt-6" onClick={() => setOpen(false)}>
        <Logo dark markClassName="size-8" className="text-[1.35rem]" />
      </Link>
      <div className="mx-4 mb-6 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Enrolled as</p>
        <p className="mt-1 text-[13px] font-bold">{spec.chip}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#D6FF57]">
          <span className="size-1.5 rounded-full bg-[#D6FF57] animate-pulse" /> Active
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-3 pb-6" aria-label={`${spec.title} navigation`}>
        <div>
          <p className="px-4 pb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">Main</p>
          <NavList items={spec.main} pathname={pathname} userRoles={user?.roles ?? []} unreadN={unreadN} onNavigate={() => setOpen(false)} />
        </div>
        <div>
          <p className="px-4 pb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">More</p>
          <NavList items={spec.more} pathname={pathname} userRoles={user?.roles ?? []} unreadN={unreadN} onNavigate={() => setOpen(false)} />
        </div>

        <div className="mt-auto rounded-[16px] bg-[#D6FF57] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Need help?</p>
          <p className="mt-1 text-[13px] font-bold leading-tight text-[#0F2A1A]">Book a free 15-min consultation</p>
          <Link href="/contact" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A] px-4 py-2 text-[12px] font-bold text-white">
            Book now <ArrowRight size={12} />
          </Link>
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F9F6ED]">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#0F2A1A]/20 bg-[#0F2A1A] lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-black/10 bg-white px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-[#0F2A1A] lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[18px] leading-none tracking-[-0.01em] text-[#0F2A1A] uppercase md:text-[20px]">
                {greetingWord()}, {isLoading ? "…" : name}
              </h1>
              <p className="hidden truncate text-[12px] text-[#0F2A1A]/65 sm:block mt-1">{spec.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* White bell surface with brand-dark icon (stays white on hover). */}
            <Link href="/notifications" className="relative grid size-10 place-items-center rounded-full border border-black/10 bg-white text-[#0F2A1A] transition hover:bg-[#F9F6ED]" aria-label="Notifications">
              <Bell size={16} />
              {unreadN > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D6FF57] px-1 text-[10px] font-bold text-[#0F2A1A]">{unreadN}</span>
              )}
            </Link>
            <Link href="/account" className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#0F2A1A] text-sm font-bold text-white ring-2 ring-white shadow" title={user?.email}>
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </Link>
            <button type="button" onClick={() => setLogoutOpen(true)} aria-label="Log out" title="Log out" className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/10 text-[#0F2A1A]/65 hover:bg-[#0F2A1A] hover:text-white sm:flex transition">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-[#0F2A1A]/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-[min(300px,88vw)] flex-col overflow-y-auto bg-[#0F2A1A] shadow-xl">
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
