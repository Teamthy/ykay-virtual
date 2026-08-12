"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, Menu, X, GraduationCap, BookOpen, MonitorPlay, Star } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { Logo } from "@/components/layout/Logo";

// NUVORA header — Tuteria-grade layout: logo · Our Services mega-dropdown ·
// "What do you want to learn?" search · Contact Us / Become a Tutor / auth.

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
      { label: "WAEC / NECO", href: "/exam-prep" },
      { label: "Entrance Exams", href: "/exam-prep" },
    ],
  },
  {
    title: "Training & Digital",
    icon: <MonitorPlay size={15} />,
    items: [
      { label: "Online Classes", href: "/online-classes" },
      { label: "Digital Skills", href: "/digital-skills" },
      { label: "Corporate Training", href: "/corporate-training" },
      { label: "For Schools", href: "/for-schools" },
    ],
  },
  {
    title: "Premium & More",
    icon: <Star size={15} />,
    items: [
      { label: "NUVORA Plus", href: "/nuvora-plus" },
      { label: "Study Abroad", href: "/study-abroad" },
      { label: "Healthcare Training", href: "/healthcare" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
];

export function Header() {
  const router = useRouter();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/tutors?subject=${encodeURIComponent(query)}` : "/tutors");
  };

  const closeAll = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ink-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-3.5 flex items-center gap-4">
        {/* Brand */}
        <Link href="/" onClick={closeAll} className="shrink-0" aria-label="NUVORA home">
          <Logo />
        </Link>

        {/* Our Services dropdown */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setServicesOpen(!servicesOpen)}
            className={cn("flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-ink-800 transition-colors", servicesOpen ? "bg-ink-100" : "hover:bg-ink-100")}
          >
            Our Services <ChevronDown size={14} className={cn("transition-transform", servicesOpen && "rotate-180")} />
          </button>
          {servicesOpen && (
            <div className="absolute left-0 top-full mt-2 w-[640px] rounded-2xl border border-ink-100 bg-white p-3 shadow-lift grid grid-cols-2 gap-1">
              {SERVICE_GROUPS.map((g) => (
                <div key={g.title} className="rounded-xl p-3">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-400 mb-2">
                    <span className="text-brand-blue">{g.icon}</span>
                    {g.title}
                  </p>
                  {g.items.map((it) => (
                    <Link key={it.label} href={it.href} onClick={closeAll}
                      className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-700 hover:bg-brand-blue-light/60 hover:text-brand-navy">
                      {it.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden md:block flex-1 max-w-[460px] relative mx-auto">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you want to learn?"
            className="w-full pl-10 pr-4 py-2.5 bg-ink-100 rounded-full text-sm text-ink-700 placeholder:text-ink-400 focus:bg-white focus:ring-2 focus:ring-brand-blue/25 outline-none transition-all"
          />
        </form>

        {/* Right side */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0 shrink-0">
          <Link href="/contact" onClick={closeAll}
            className="hidden xl:block px-3 py-2.5 rounded-xl text-sm font-semibold text-ink-700 hover:bg-ink-100 transition-colors">
            Contact Us
          </Link>
          <Link href="/become-tutor" onClick={closeAll}
            className="hidden md:block px-3.5 py-2.5 rounded-xl text-sm font-bold text-brand-blue hover:bg-brand-blue-light transition-colors">
            Become a Tutor
          </Link>
          <AuthNav />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-ink-800" aria-label="Menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-100 bg-white px-6 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          <p className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">Learn</p>
          {SERVICE_GROUPS.flatMap((g) => g.items).map((it) => (
            <Link key={it.label} href={it.href} onClick={closeAll}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
              {it.label}
            </Link>
          ))}
          <div className="border-t border-ink-100 mt-2 pt-2">
            <MobileLink href="/contact" label="Contact Us" onClose={closeAll} />
            <MobileLink href="/become-tutor" label="Become a Tutor" onClose={closeAll} />
          </div>
        </div>
      )}
    </header>
  );
}

function MobileLink({ href, label, onClose }: { href: string; label: string; onClose: () => void }) {
  return (
    <Link href={href} onClick={onClose} className="block rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
      {label}
    </Link>
  );
}

import { cn } from "@/lib/utils";
