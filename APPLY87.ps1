# APPLY87.ps1 — fix notifications build + logout overlay. Run from repo root.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\app')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

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
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\notifications\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/notifications/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import { useEffect, useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";

// Modal confirmation — stays on the current screen (not /logout).

export function LogoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, isLoading } = useSession();
  const doLogout = useLogout();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await doLogout();
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Could not log out. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/50"
        aria-label="Stay signed in"
        disabled={busy}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Session</p>
        <h2 id="logout-title" className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">
          Log out of NUVORA?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {isLoading
            ? "Checking your session…"
            : user
              ? `You are signed in as ${user.email}. Logging out ends this session on this device.`
              : "You are not signed in on this device."}
        </p>
        {err && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-navy px-5 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50"
              >
                {busy ? "Logging out…" : "Yes, log out"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-bold text-ink-800 hover:border-brand-navy"
              >
                Stay signed in
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-gold px-5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\LogoutDialog.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/LogoutDialog.tsx'

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
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\AppShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/AppShell.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { LogoutDialog } from "@/components/layout/LogoutDialog";
import { isAdmin } from "@/features/auth/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useDict } from "@/hooks/useDict";

// Header auth chip: Log in / Register when signed out; account menu (with
// role-aware links) + logout when signed in.
export function AuthNav() {
  const { user, isLoading } = useSession();
  const { t } = useDict();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200">
        {t("auth.login")}
      </Link>
    );
  }

  // Role-aware primary dashboard link (a STUDENT must never see "Parent
  // dashboard"; each role gets its own personalized destination).
  const primaryDashboard = isAdmin(user)
    ? { href: "/admin", label: "Admin console" }
    : user.roles.includes("TUTOR")
      ? { href: "/tutor-dashboard", label: "Tutor dashboard" }
      : user.roles.includes("STUDENT")
        ? { href: "/student-dashboard", label: "My dashboard" }
        : { href: "/dashboard", label: "Parent dashboard" };

  const links = [
    primaryDashboard,
    { href: "/account", label: "Account" },
    { href: "/messages", label: "Messages" },
    { href: "/notifications", label: "Notifications" },
  ];

  // Avatar: use the profile image when present, otherwise a letter tile.
  const initials = (user.first_name?.[0] ?? user.email[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-4 text-sm font-semibold hover:border-brand-blue transition-colors"
      >
        <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-xs font-bold text-white">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        {user.first_name?.slice(0, 14) ?? user.email.split("@")[0].slice(0, 12)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift z-50">
          <p className="px-3 py-2 text-xs text-ink-500 truncate">{user.email}</p>
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                {r}
              </span>
            ))}
          </div>
          <div className="border-t border-ink-100 pt-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/logout"
              onClick={() => setOpen(false)}
              className="block w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Log out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\AuthNav.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/AuthNav.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import { usePathname } from "next/navigation";

// ShellVisibility — keeps marketing chrome (header/footer/mobile nav/chat)
// OFF authenticated surfaces. Dashboards render their own personalized
// DashboardShell instead; this removes the "why is the homepage navbar on
// my dashboard?" problem structurally, not visually.

const APP_PREFIXES = [
  "/dashboard",
  "/student-dashboard",
  "/tutor-dashboard",
  "/lms",
  "/admin",
  "/messages",
  "/notifications",
  "/checkout",
  "/account",
  "/saved",
  "/chat",
  "/offline",
  "/onboarding",
];

export function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function ShellVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAppRoute(pathname)) return null;
  return <>{children}</>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\ShellVisibility.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/ShellVisibility.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\logout' | Out-Null
$content = @'
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old /logout URL — send people back. Confirmation is a modal on the current page.
export default function LogoutRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <p className="px-6 py-16 text-center text-sm text-ink-500">Taking you back…</p>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\logout\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/logout/page.tsx'

Write-Host 'Done. git add those files, commit, push. Do not add APPLY87.ps1.'
