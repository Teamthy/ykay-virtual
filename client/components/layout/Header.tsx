"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, ArrowRight } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { useSession } from "@/hooks/useSession";
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
 * Global header — dark floating pill. Primary links are College, CBT and
 * Services (the same set as the homepage pill). Homepage yields to HomePillNav.
 */
export function Header() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();

  if (pathname === "/") return null;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const closeAll = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        aria-label="Primary"
        className="relative mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between gap-3 rounded-full bg-[#0F2A1A] py-2 pe-2 ps-4 shadow-[0_18px_44px_rgba(0,0,0,0.28)] sm:h-16 sm:pe-2.5 sm:ps-6"
      >
        <Link href="/" onClick={closeAll} className="flex-none" aria-label="YK-Virtual home">
          <Logo dark markClassName="size-7 sm:size-8" className="text-[1.15rem] sm:text-[1.35rem]" />
        </Link>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 xl:flex">
          {PRIMARY_LINKS.map((l) => {
            const active = navActive(pathname, l.href);
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

          <div className="hidden items-center gap-1 lg:flex">
            <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            <LanguageSwitcher tone="dark" />
            <AuthNav tone="dark" />
            {!isLoading && !user && (
              <Link href="/onboarding" className="ml-1 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-[13px] font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]">
                Get started <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"><ArrowRight size={12} /></span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <AuthNav tone="dark" />
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10" aria-label={mobileOpen ? "Close menu" : "Open menu"}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mx-auto mt-2 w-full max-w-[1920px] px-3 sm:px-4 lg:hidden">
          <div className="rounded-[1.75rem] bg-[#0F2A1A] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
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
            <div className="grid grid-cols-2 gap-1">
              {PRIMARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeAll}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    navActive(pathname, l.href) ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
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
    </header>
  );
}
