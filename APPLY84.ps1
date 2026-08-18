# APPLY84.ps1 — from repo root:  powershell -NoProfile -ExecutionPolicy Bypass -File .\APPLY84.ps1
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\components\layout')) { throw 'Run this from the ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path '.' | Out-Null
$content = @'
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

// PageHero — the UNIFORM hero for every non-home page. Self-contained: the
// background is an inline SVG grid (no remote asset) unless `cover` is set,
// in which case a local /hero photo is painted under a navy scrim so title,
// crumbs and CTAs stay light. Never put dark ink on a photo or navy field.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%2370F250' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

export type Crumb = { name: string; href?: string };
export type HeroCTA = { label: string; href: string; primary?: boolean };

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  announcement?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  ctas?: HeroCTA[];
  align?: "left" | "center";
  /** Optional split-hero image (bundled, local) — rendered right of the text. */
  image?: { src: string; alt: string };
  /** Full-bleed photo behind the hero copy (local /hero/*.jpg). */
  cover?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHero({
  title,
  subtitle,
  announcement,
  eyebrow,
  crumbs,
  ctas,
  align = "center",
  image,
  cover,
  children,
  className,
}: PageHeroProps) {
  const pill = announcement ?? eyebrow;
  const centered = align === "center";
  const split = Boolean(image) && !cover;
  const navyTone =
    Boolean(className?.includes("bg-brand-navy")) ||
    Boolean(className?.includes("from-brand-navy")) ||
    Boolean(className?.includes("from-[#060F26]"));
  const onPhoto = Boolean(cover) || navyTone;

  const backgroundImage = cover
    ? `linear-gradient(180deg, rgba(6,15,38,0.76) 0%, rgba(6,15,38,0.88) 100%), url("${cover}")`
    : GRID_BG;

  const text = (
    <>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className={cn("mb-6 text-xs", onPhoto ? "text-white/70" : "text-ink-500")}>
          <ol className={cn("flex flex-wrap items-center gap-1.5", centered && !split && "justify-center")}>
            {crumbs.map((c, i) => (
              <li key={c.name} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className={onPhoto ? "text-white/40" : "text-ink-300"}>/</span>}
                {c.href ? (
                  <Link
                    href={c.href}
                    className={cn(
                      "underline-offset-2 hover:underline",
                      onPhoto ? "text-white/80 hover:text-white" : "hover:text-brand-navy"
                    )}
                  >
                    {c.name}
                  </Link>
                ) : (
                  <span className={cn("font-medium", onPhoto ? "text-white" : "text-ink-700")}>{c.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {pill && (
        <span className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em]",
          onPhoto ? "border-white/30 bg-white/10 text-white" : "border-ink-200 bg-white text-brand-navy"
        )}>
          <span className="size-1.5 rounded-full bg-brand-gold" />
          {pill}
        </span>
      )}

      <h1
        className={cn(
          "mt-6 font-display text-4xl leading-[1.08] tracking-[0.01em] md:text-6xl",
          onPhoto ? "text-white drop-shadow-sm" : "text-brand-navy",
          centered && !split && "mx-auto max-w-[850px]"
        )}
      >
        {title}
      </h1>

      {subtitle && (
        <p className={cn("mt-5 max-w-2xl text-base leading-relaxed md:text-lg", onPhoto ? "text-white/85" : "text-ink-600", centered && !split && "mx-auto")}>
          {subtitle}
        </p>
      )}

      {ctas && ctas.length > 0 && (
        <div className={cn("mt-8 flex flex-wrap items-center gap-3", centered && !split && "justify-center")}>
          {ctas.map((cta) =>
            cta.primary ? (
              <Link
                key={cta.label}
                href={cta.href}
                className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
              >
                {cta.label}
              </Link>
            ) : (
              <Link
                key={cta.label}
                href={cta.href}
                className={cn(
                  "rounded-full border px-7 py-3.5 text-sm font-bold transition",
                  onPhoto
                    ? "border-white/50 text-white hover:bg-white/10"
                    : "border-ink-300 text-ink-800 hover:border-brand-navy hover:bg-brand-navy hover:text-white"
                )}
              >
                {cta.label}
              </Link>
            )
          )}
        </div>
      )}

      {children && (
        <div className={cn("mt-7 flex flex-wrap gap-3", centered && !split && "justify-center", onPhoto && "[&_a]:text-inherit")}>
          {children}
        </div>
      )}
    </>
  );

  return (
    <section
      className={cn(
        "w-full border-b bg-no-repeat bg-cover bg-center",
        onPhoto ? "border-white/10 text-white" : "border-ink-100 bg-surface text-ink-800",
        className
      )}
      style={{ backgroundImage }}
    >
      {split ? (
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>{text}</div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-100">
              <Image
                src={image!.src}
                alt={image!.alt}
                width={960}
                height={720}
                priority
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto max-w-[1100px] px-6 pb-16 pt-14 md:pb-24 md:pt-20",
            centered && "flex flex-col items-center text-center"
          )}
        >
          {text}
        </div>
      )}
    </section>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\PageHero.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/PageHero.tsx'

New-Item -ItemType Directory -Force -Path '.' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useDict } from "@/hooks/useDict";

// Header auth chip: Log in / Register when signed out; account menu (with
// role-aware links) + logout when signed in.
export function AuthNav() {
  const { user, isLoading } = useSession();
  const { t } = useDict();
  const [open, setOpen] = useState(false);

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

New-Item -ItemType Directory -Force -Path '.' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { homeForRoles } from "@/hooks/useDashboardRoute";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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
    router.push("/logout");
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
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\DashboardShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/DashboardShell.tsx'

New-Item -ItemType Directory -Force -Path '.' | Out-Null
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
  "/logout",
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

New-Item -ItemType Directory -Force -Path '.' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";
import { homeForRoles } from "@/hooks/useDashboardRoute";

// Dedicated logout confirmation — replaces window.confirm in the header
// and dashboard chrome so the choice is a real screen, not a browser dialog.

export default function LogoutPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const doLogout = useLogout();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stayHref = user ? homeForRoles(user.roles) : "/";

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
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Session</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">Log out of NUVORA?</h1>
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
                onClick={() => router.push(stayHref)}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-bold text-ink-800 hover:border-brand-navy"
              >
                Stay signed in
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-gold px-5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Go to log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\logout\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/logout/page.tsx'


function Unwrap-PageHero([string]$rel) {
  $path = Join-Path (Get-Location) $rel
  if (-not (Test-Path $path)) { Write-Host "skip missing $rel"; return }
  $t = [System.IO.File]::ReadAllText($path)
  if ($t -notmatch 'PageHero') { return }
  $m = [regex]::Match($t, '<main([^>]*className="[^"]*container-x[^"]*"[^>]*)>')
  if (-not $m.Success) { Write-Host "already full-bleed or no wrap: $rel"; return }
  $open = $m.Groups[0].Value
  $clsM = [regex]::Match($open, 'className="([^"]*)"')
  $tokens = $clsM.Groups[1].Value.Split(@(' '), [StringSplitOptions]::RemoveEmptyEntries)
  $inner = @('container-x') + @($tokens | Where-Object { $_ -like 'py-*' -or $_ -like 'pb-*' -or $_ -like 'pt-*' })
  $outer = @($tokens | Where-Object { $_ -ne 'container-x' -and $_ -notlike 'py-*' -and $_ -notlike 'pb-*' -and $_ -notlike 'pt-*' })
  if ($outer.Count -gt 0) {
    $newOpen = [regex]::Replace($open, 'className="[^"]*"', ('className="' + ($outer -join ' ') + '"'), 1)
  } else {
    $newOpen = [regex]::Replace($open, '\s*className="[^"]*"', '', 1)
  }
  $start = $t.IndexOf('<PageHero')
  if ($start -lt 0 -or $start -lt $m.Index) { Write-Host "skip hero $rel"; return }
  $named = $t.IndexOf('</PageHero>', $start)
  $selfc = $t.IndexOf('/>', $start)
  if ($named -ge 0 -and ($selfc -lt 0 -or $named -lt $selfc)) { $end = $named + 11 } elseif ($selfc -ge 0) { $end = $selfc + 2 } else { return }
  $prefix = $t.Substring(0, $m.Index) + $newOpen + $t.Substring($m.Index + $m.Length, $start - ($m.Index + $m.Length))
  $hero = $t.Substring($start, $end - $start)
  $suffix = $t.Substring($end)
  $last = $suffix.LastIndexOf('</main>')
  if ($last -lt 0) { return }
  $innerHtml = $suffix.Substring(0, $last)
  $after = $suffix.Substring($last)
  $new = $prefix + "`n      " + $hero + "`n`n      <div className=`"" + ($inner -join ' ') + "`">" + $innerHtml + "`n      </div>`n    " + $after
  [System.IO.File]::WriteAllText($path, $new.Replace("`r`n","`n"), $utf8)
  Write-Host "unwrapped $rel"
}

$unwrap = @(
  'client\app\(marketing)\about\page.tsx',
  'client\app\(marketing)\exam-prep\page.tsx',
  'client\app\(marketing)\how-it-works\page.tsx',
  'client\app\(marketing)\programmes\page.tsx',
  'client\app\(marketing)\subjects\page.tsx',
  'client\app\(marketing)\cohorts\page.tsx',
  'client\app\(marketing)\contact\page.tsx',
  'client\app\(marketing)\careers\page.tsx',
  'client\app\(marketing)\blog\page.tsx',
  'client\app\(marketing)\become-tutor\page.tsx',
  'client\app\(marketing)\corporate-training\page.tsx',
  'client\app\(marketing)\for-schools\page.tsx',
  'client\app\(marketing)\online-classes\page.tsx',
  'client\app\(marketing)\resources\page.tsx',
  'client\app\(marketing)\success-stories\page.tsx',
  'client\app\(marketing)\curricula\british\page.tsx',
  'client\app\(marketing)\curricula\nigerian\page.tsx',
  'client\app\help\page.tsx'
)
foreach ($p in $unwrap) { Unwrap-PageHero $p }

# Ensure cover photos on key heroes if the prop is missing
function Ensure-Cover([string]$rel, [string]$cover) {
  $path = Join-Path (Get-Location) $rel
  if (-not (Test-Path $path)) { return }
  $t = [System.IO.File]::ReadAllText($path)
  if ($t -notmatch 'PageHero') { return }
  if ($t -match 'cover=') { return }
  $t2 = $t.Replace('<PageHero', "<PageHero`n        cover=`"$cover`"")
  if ($t2 -ne $t) {
    [System.IO.File]::WriteAllText($path, $t2.Replace("`r`n","`n"), $utf8)
    Write-Host "cover $rel"
  }
}
Ensure-Cover 'client\app\(marketing)\about\page.tsx' '/hero/about.jpg'
Ensure-Cover 'client\app\(marketing)\exam-prep\page.tsx' '/hero/exam-prep.jpg'
Ensure-Cover 'client\app\(marketing)\how-it-works\page.tsx' '/hero/how-it-works.jpg'
Ensure-Cover 'client\app\(marketing)\programmes\page.tsx' '/hero/programmes.jpg'
Ensure-Cover 'client\app\(marketing)\subjects\page.tsx' '/hero/subjects.jpg'
Ensure-Cover 'client\app\(marketing)\cohorts\page.tsx' '/hero/cohorts.jpg'
Ensure-Cover 'client\app\(marketing)\online-classes\page.tsx' '/hero/programmes.jpg'
Ensure-Cover 'client\app\(marketing)\curricula\british\page.tsx' '/hero/british.jpg'
Ensure-Cover 'client\app\(marketing)\curricula\nigerian\page.tsx' '/hero/nigerian.jpg'

Write-Host ''
Write-Host 'Done. Then run:'
Write-Host '  git add client/components/layout/PageHero.tsx client/components/layout/AuthNav.tsx client/components/layout/DashboardShell.tsx client/components/layout/ShellVisibility.tsx client/app/logout/page.tsx'
Write-Host '  git add "client/app/(marketing)/about/page.tsx" "client/app/(marketing)/exam-prep/page.tsx"'
Write-Host '  git status'
Write-Host '  git commit -m "fix photo/navy hero contrast and add logout confirmation"'
Write-Host '  git push'
Write-Host 'Do not git add APPLY84.ps1 or loose *.jpg in the repo root.'

