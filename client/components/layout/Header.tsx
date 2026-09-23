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
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white">
      <nav className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-12">
        <Link href="/" onClick={closeAll} className="flex-none" aria-label="YK-Virtual home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeAll}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-bold transition",
                pathname === l.href ? "bg-[#0F2A1A] text-white" : "text-[#0F2A1A]/70 hover:bg-[#0F2A1A]/5 hover:text-[#0F2A1A]",
              )}
            >
              {l.label}
            </Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={cn(
                "flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-bold transition",
                servicesOpen ? "bg-[#0F2A1A] text-white" : "text-[#0F2A1A]/70 hover:bg-[#0F2A1A]/5",
              )}
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
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">Ykay students</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/ykay-students.png" alt="Ykay College students" className="mt-3 h-32 w-full rounded-[12px] object-cover" />
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
          <form onSubmit={submitSearch} className="relative hidden lg:block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F2A1A]/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subjects, tutors…"
              className="w-56 rounded-full border border-black/10 bg-[#F9F6ED] py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#0F2A1A] outline-none placeholder:text-[#0F2A1A]/40 focus:border-[#0F2A1A] focus:bg-white"
            />
          </form>

          <div className="hidden items-center gap-1 lg:flex">
            <ThemeToggle />
            <LanguageSwitcher />
            <AuthNav />
            {!isLoading && !user && (
              <Link href="/onboarding" className="ml-1 inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-black">
                Get started <span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={12} /></span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <AuthNav />
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-[#0F2A1A]">
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-black/10 bg-white px-4 py-4 sm:px-6">
          <form onSubmit={submitSearch} className="relative mb-4">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F2A1A]/40" />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-full border border-black/10 bg-[#F9F6ED] py-2.5 pl-10 pr-4 text-[13px]" />
          </form>
          <div className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className="rounded-full px-4 py-2.5 text-[14px] font-bold text-[#0F2A1A] hover:bg-[#F9F6ED]">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {SERVICE_GROUPS.flatMap((g) => g.items).slice(0, 6).map((it) => (
              <Link key={it.label} href={it.href} onClick={closeAll} className="rounded-full bg-[#F9F6ED] px-4 py-2 text-[12px] font-semibold text-[#0F2A1A]/70">
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
