"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, Menu, X, GraduationCap, BookOpen, MonitorPlay, Star, ArrowRight } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const SERVICE_GROUPS = [
  {
    title: "K-12 Academics",
    icon: <GraduationCap size={14} />,
    items: [
      { label: "Home Tutoring", href: "/hometutors" },
      { label: "Private Tuition", href: "/private-tuition" },
      { label: "Group Cohorts", href: "/cohorts" },
      { label: "Online Classes", href: "/online-classes" },
      { label: "British Curriculum", href: "/curricula/british" },
      { label: "Nigerian Curriculum", href: "/curricula/nigerian" },
    ],
  },
  {
    title: "Tests & Exams",
    icon: <BookOpen size={14} />,
    items: [
      { label: "CBT Practice", href: "/login?next=/lms/practice" },
      { label: "UTME 2026 Prep", href: "/utme-2026" },
      { label: "GMAT Prep", href: "/gmat" },
      { label: "SAT / GRE", href: "/test-prep" },
      { label: "Entrance Exams", href: "/entrance-exam" },
    ],
  },
  {
    title: "Training & Digital",
    icon: <MonitorPlay size={14} />,
    items: [
      { label: "Digital Skills", href: "/digital-skills" },
      { label: "Programmes", href: "/programmes" },
      { label: "Subjects", href: "/subjects" },
    ],
  },
  {
    title: "The Ykay family",
    icon: <Star size={14} />,
    items: [
      { label: "Ykay College", href: "/college" },
      { label: "YK-Virtual Plus", href: "/plus" },
      { label: "Pricing", href: "/pricing" },
      { label: "Become a tutor", href: "/become-tutor" },
    ],
  },
];

const NAV_LINKS = [
  { label: "Programmes", href: "/programmes" },
  { label: "Cohorts", href: "/cohorts" },
  { label: "Tutors", href: "/tutors" },
  { label: "How it works", href: "/how-it-works" },
  { label: "College", href: "/college" },
  { label: "About", href: "/about" },
];

/**
 * Global header — a dark floating pill matching the homepage HomePillNav:
 * white logo variant, white/70 links and a lime CTA with dark text. The
 * homepage yields to HomePillNav instead (both are the same pattern).
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

        {/* Centred links (xl+) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 xl:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
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
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={cn(
                "pointer-events-auto flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                servicesOpen ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              aria-expanded={servicesOpen}
            >
              Services <ChevronDown size={14} className={cn("transition", servicesOpen && "rotate-180")} />
            </button>

            {servicesOpen && (
              <div className="absolute left-1/2 top-full z-20 mt-3 w-[min(92vw,820px)] -translate-x-1/2 overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_16px_60px_rgba(15,42,26,0.15)]">
                <div className="grid sm:grid-cols-[1.4fr_0.6fr]">
                  <div className="grid grid-cols-2 gap-1 p-4">
                    {SERVICE_GROUPS.map((g) => (
                      <div key={g.title} className="rounded-[14px] bg-[#F9F6ED]/60 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">
                          <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white">{g.icon}</span>
                          {g.title}
                        </span>
                        <div className="mt-2 space-y-0.5">
                          {g.items.map((it) => (
                            <Link key={it.label} href={it.href} onClick={closeAll} className="block rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#0F2A1A]/70 hover:bg-white hover:text-[#0F2A1A]">
                              {it.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#0F2A1A] p-5 text-white">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">The Ykay family</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/campus-hero.jpg" alt="Ykay College campus with students in uniform" className="mt-3 h-32 w-full rounded-[12px] object-cover" />
                    <p className="mt-3 text-[12px] leading-relaxed text-white/70">One family — campus in Sango Ota, live classes and CBT online.</p>
                    <Link href="/college" onClick={closeAll} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#D6FF57] px-4 py-2 text-[12px] font-bold text-[#0F2A1A]">
                      Visit Ykay College <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
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

      {/* Mobile panel — dark, matching HomePillNav's collapsed panel */}
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
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeAll}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === l.href ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 border-t border-white/10 pt-2">
              {SERVICE_GROUPS.flatMap((g) => g.items).slice(0, 8).map((it) => (
                <Link key={it.label} href={it.href} onClick={closeAll} className="rounded-xl px-3 py-2 text-[12px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                  {it.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                onClick={closeAll}
                className="grid place-items-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding"
                onClick={closeAll}
                className="grid place-items-center rounded-full bg-[#D6FF57] px-4 py-2.5 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
