"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, X, ArrowRight } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import {
  MobileServiceGroups,
  PRIMARY_LINKS,
  ServicesDropdown,
  ServicesToggle,
  navActive,
} from "@/components/layout/public-nav";
import { cn } from "@/lib/utils";

/**
 * Global header — the dark-green YK-Virtual brand bar on EVERY public and
 * marketing page, including the homepage. Desktop (xl+) shows the full set:
 * Programmes · Cohorts · Tutors · How it works · College · About · Services ▾
 * · search · theme toggle · EN · Log in · lime Get started. Below xl there is
 * one hamburger menu (same on every page) with the primary links, the
 * Services groups, search, Sign in and Get started — so tablets never end up
 * with links at one breakpoint and actions at another.
 */
export function Header() {
  const router = useRouter();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();

  // Close the menu with Escape so it always opens and closes cleanly.
  useEffect(() => {
    if (!mobileOpen && !servicesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, servicesOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    closeAll();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const closeAll = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  const activePath = pathname;

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="relative mx-auto w-full max-w-[1920px]">
        <nav
          aria-label="Primary"
          className="relative flex h-14 w-full items-center justify-between gap-3 rounded-full bg-[#0F2A1A] py-2 pe-2 ps-4 shadow-[0_18px_44px_rgba(0,0,0,0.28)] sm:h-16 sm:pe-2.5 sm:ps-6"
        >
          <Link href="/" onClick={closeAll} className="flex-none" aria-label="YK-Virtual home">
            <Logo dark markClassName="size-7 sm:size-8" className="text-[1.15rem] sm:text-[1.35rem]" />
          </Link>

          {/* Desktop primary links — same breakpoint (xl) as the actions so
              tablet never gets one without the other. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 xl:flex">
            {PRIMARY_LINKS.map((l) => {
              const active = navActive(activePath, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeAll}
                  className={cn(
                    "pointer-events-auto relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                    active ? "text-white" : "text-white/70 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                  {active && (
                    <span aria-hidden="true" className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
            <div className="relative">
              <ServicesToggle open={servicesOpen} onToggle={() => setServicesOpen((v) => !v)} />
              <ServicesDropdown open={servicesOpen} onClose={() => setServicesOpen(false)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop search + theme + EN + Log in + Get started (xl only) */}
            <form onSubmit={submitSearch} className="relative hidden xl:block">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search subjects, tutors…"
                aria-label="Search subjects and tutors"
                className="w-56 rounded-full border border-white/15 bg-white/10 py-2.5 pl-10 pr-4 text-[13px] font-medium text-white outline-none placeholder:text-white/50 focus:border-white/40 focus:bg-white/15"
              />
            </form>

            <div className="hidden items-center gap-1 xl:flex">
              <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
              <LanguageSwitcher tone="dark" />
              <AuthNav tone="dark" />
              <Link href="/onboarding" className="ml-1 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]">
                Get started <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"><ArrowRight size={12} /></span>
              </Link>
            </div>

            {/* Below xl: account chip + one hamburger (menu has it all) */}
            <div className="flex items-center gap-2 xl:hidden">
              <AuthNav tone="dark" />
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </nav>

        {mobileOpen && (
          <div id="mobile-menu" className="absolute inset-x-0 top-full z-50 mt-2 xl:hidden">
            <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[1.75rem] bg-[#0F2A1A] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
              <form onSubmit={submitSearch} className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search subjects, tutors…"
                  aria-label="Search subjects and tutors"
                  className="w-full rounded-full border border-white/15 bg-white/10 py-2.5 pl-10 pr-4 text-[13px] font-medium text-white outline-none placeholder:text-white/50 focus:border-white/40 focus:bg-white/15"
                />
              </form>

              <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-3">
                <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
                <LanguageSwitcher tone="dark" />
              </div>

              <div className="grid grid-cols-2 gap-1">
                {PRIMARY_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={closeAll}
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      navActive(activePath, l.href) ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
              <MobileServiceGroups onNavigate={closeAll} />
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link href="/login" onClick={closeAll} className="grid place-items-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
                  Sign in
                </Link>
                <Link href="/onboarding" onClick={closeAll} className="grid place-items-center rounded-full bg-[#D6FF57] px-4 py-2.5 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]">
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
