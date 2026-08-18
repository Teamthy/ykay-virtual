"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, Menu, X, GraduationCap, BookOpen, MonitorPlay, Star, ArrowRight } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

// NUVORA header — clean Preline-style: brand · inline links · Services
// mega-menu (grouped + customer story) · divider · Sign in · Get started.

const SERVICE_GROUPS = [
  {
    title: "K-12 Academics",
    icon: <GraduationCap size={15} />,
    items: [
      { label: "Home Tutoring", href: "/hometutors" },
      { label: "Group Cohorts", href: "/cohorts" },
      { label: "British Curriculum", href: "/curricula/british" },
      { label: "Nigerian Curriculum", href: "/curricula/nigerian" },
    ],
  },
  {
    title: "Tests & Exams",
    icon: <BookOpen size={15} />,
    items: [
      { label: "UTME 2026 Prep", href: "/utme-2026" },
      { label: "GMAT Prep", href: "/gmat" },
      { label: "Test Prep Hub", href: "/test-prep" },
      { label: "Entrance Exams", href: "/entrance-exam" },
    ],
  },
  {
    title: "Training & Digital",
    icon: <MonitorPlay size={15} />,
    items: [
      { label: "Online Classes", href: "/online-classes" },
      { label: "Digital Skills", href: "/digital-skills" },
      { label: "Study Abroad", href: "/study-abroad" },
    ],
  },
  {
    title: "Premium & More",
    icon: <Star size={15} />,
    items: [
      { label: "NUVORA Plus", href: "/nuvora-plus" },
      { label: "Pricing", href: "/pricing" },
      { label: "Programmes", href: "/programmes" },
      { label: "Subjects", href: "/subjects" },
    ],
  },
];

const NAV_LINKS = [
  { label: "Programmes", href: "/programmes" },
  { label: "Cohorts", href: "/cohorts" },
  { label: "Tutors", href: "/tutors" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

export function Header() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

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
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-white dark:border-[#214c37] dark:bg-[#0d1f16]">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-6 py-3 md:px-10">
        {/* Brand */}
        <Link href="/" onClick={closeAll} className="flex-none" aria-label="NUVORA home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeAll}
              className="rounded-lg p-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {l.label}
            </Link>
          ))}

          {/* Services mega-menu */}
          <div className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={cn(
                "flex items-center gap-1 rounded-lg p-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900",
                servicesOpen && "bg-ink-100"
              )}
              aria-haspopup="menu"
              aria-expanded={servicesOpen}
            >
              Services
              <ChevronDown size={14} className={cn("transition-transform duration-300", servicesOpen && "rotate-180")} />
            </button>

            {servicesOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 w-[min(92vw,700px)] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg sm:left-auto sm:right-0">
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  {/* Groups */}
                  <div className="grid grid-cols-1 gap-0.5 p-3 sm:col-span-3 sm:grid-cols-2">
                    {SERVICE_GROUPS.map((g) => (
                      <div key={g.title} className="p-2">
                        <span className="ms-2.5 mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                          {g.title}
                        </span>
                        {g.items.map((it) => (
                          <Link
                            key={it.label}
                            href={it.href}
                            onClick={closeAll}
                            className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-100"
                          >
                            <span className="shrink-0 text-brand-gold-dark">{g.icon}</span>
                            {it.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Promo column — customer stories (no fabricated quotes) */}
                  <div className="flex flex-col bg-ink-50 p-4 sm:col-span-1">
                    <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Parent stories
                    </span>
                    <img
                      src="/hero/home-tutoring.jpg"
                      alt="Student learning with a NUVORA tutor"
                      className="h-24 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                    <p className="mt-3 text-sm leading-relaxed text-ink-700">
                      Real families, real results — read parent stories published with explicit consent.
                    </p>
                    <a
                      href="/success-stories"
                      onClick={closeAll}
                      className="mt-3 inline-flex items-center gap-x-1 text-sm font-bold text-brand-green decoration-2 hover:underline"
                    >
                      Read parent stories
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider + buttons */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <div className="mx-2 h-4 w-px bg-ink-200" aria-hidden="true" />
          <ThemeToggle />
          <LanguageSwitcher />
          <AuthNav />
          {!isLoading && !user && (
            <Link
              href="/onboarding"
              className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-brand-gold-hover"
            >
              Get started
            </Link>
          )}
        </div>

        <ThemeToggle className="lg:hidden" />
        <LanguageSwitcher className="lg:hidden" />
        {/* Search (mobile-accessible) + toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <form onSubmit={submitSearch} className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What do you want to learn?"
              className="w-48 rounded-full border border-ink-200 bg-ink-50 py-2 pl-8 pr-3 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
            />
          </form>
          <AuthNav />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            className="relative flex size-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-800 hover:bg-ink-50"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile collapse */}
      {mobileOpen && (
        <div className="max-h-[75vh] overflow-y-auto border-t border-ink-100 bg-white px-6 py-4 lg:hidden">
          <div className="space-y-0.5">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
                {l.label}
              </Link>
            ))}
            {SERVICE_GROUPS.map((g) => (
              <div key={g.title} className="pt-2">
                <span className="ms-2 block pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{g.title}</span>
                {g.items.map((it) => (
                  <Link key={it.label} href={it.href} onClick={closeAll} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          {!isLoading && !user && (
            <div className="mt-3 border-t border-ink-100 pt-3">
              <Link
                href="/onboarding"
                onClick={closeAll}
                className="block rounded-lg bg-brand-gold px-4 py-2.5 text-center text-sm font-medium text-ink-900"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
