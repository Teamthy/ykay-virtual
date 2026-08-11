"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, Menu, X } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { cn } from "@/lib/utils";

// Fully-wired header: every link points at a real route (no dead hrefs).

const SERVICES = [
  { href: "/programmes", label: "Programmes", desc: "Cohorts, bootcamps & structured courses" },
  { href: "/cohorts", label: "Group Cohorts", desc: "Scheduled small-group classes" },
  { href: "/private-tuition", label: "Private Tuition", desc: "One-to-one with a vetted tutor" },
  { href: "/exam-prep", label: "Exam Preparation", desc: "WAEC, NECO, JAMB, IGCSE, A-Level" },
  { href: "/digital-skills", label: "Computing & Digital Skills", desc: "CS, Python, AI, Cybersecurity" },
  { href: "/tutors", label: "Find a Tutor", desc: "Browse approved tutors" },
];

const CURRICULA = [
  { href: "/curricula/british", label: "British Curriculum", desc: "Year 7–9, IGCSE, A-Level" },
  { href: "/curricula/nigerian", label: "Nigerian Curriculum", desc: "JSS1–3, SSS1–3, WAEC/NECO/JAMB" },
];

export function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [curriculaOpen, setCurriculaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/tutors?subject=${encodeURIComponent(query)}` : "/tutors");
  };

  const closeAll = () => {
    setServicesOpen(false);
    setCurriculaOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ink-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex items-center gap-5">
        {/* Brand */}
        <Link href="/" onClick={closeAll} className="flex items-center gap-2 text-2xl font-extrabold text-brand-blue tracking-tight shrink-0">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h12a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H4V4zm2 2v16h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6z"/>
          </svg>
          ykay
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Services dropdown */}
          <div className="relative">
            <button
              onClick={() => { setServicesOpen(!servicesOpen); setCurriculaOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 transition-colors",
                servicesOpen ? "bg-ink-100" : "hover:bg-ink-100"
              )}
            >
              Our Services <ChevronDown size={14} className={cn("transition-transform", servicesOpen && "rotate-180")} />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
                {SERVICES.map((s) => (
                  <Link key={s.href} href={s.href} onClick={closeAll}
                    className="block rounded-xl px-4 py-3 hover:bg-ink-50">
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="block text-xs text-ink-500">{s.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Curricula dropdown */}
          <div className="relative">
            <button
              onClick={() => { setCurriculaOpen(!curriculaOpen); setServicesOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 transition-colors",
                curriculaOpen ? "bg-ink-100" : "hover:bg-ink-100"
              )}
            >
              Curricula <ChevronDown size={14} className={cn("transition-transform", curriculaOpen && "rotate-180")} />
            </button>
            {curriculaOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
                {CURRICULA.map((c) => (
                  <Link key={c.href} href={c.href} onClick={closeAll}
                    className="block rounded-xl px-4 py-3 hover:bg-ink-50">
                    <span className="text-sm font-semibold">{c.label}</span>
                    <span className="block text-xs text-ink-500">{c.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/programmes" onClick={closeAll} className="px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 hover:bg-ink-100 transition-colors">Programmes</Link>
          <Link href="/private-tuition" onClick={closeAll} className="px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 hover:bg-ink-100 transition-colors">Private Tuition</Link>
          <Link href="/tutors" onClick={closeAll} className="px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 hover:bg-ink-100 transition-colors">Tutors</Link>
          <Link href="/about" onClick={closeAll} className="px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 hover:bg-ink-100 transition-colors">About</Link>
        </nav>

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden md:block flex-1 max-w-[420px] relative ml-auto">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tutors or subjects…"
            className="w-full pl-12 pr-5 py-3 bg-ink-100 rounded-full text-sm text-ink-700 focus:bg-ink-200 focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
          />
        </form>

        {/* Auth + mobile toggle */}
        <div className="flex items-center gap-3 ml-auto lg:ml-0">
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
          <MobileLink href="/programmes" label="Programmes" onClose={closeAll} />
          <MobileLink href="/cohorts" label="Group Cohorts" onClose={closeAll} />
          <MobileLink href="/private-tuition" label="Private Tuition" onClose={closeAll} />
          <MobileLink href="/exam-prep" label="Exam Preparation" onClose={closeAll} />
          <MobileLink href="/digital-skills" label="Digital Skills" onClose={closeAll} />
          <MobileLink href="/curricula/british" label="British Curriculum" onClose={closeAll} />
          <MobileLink href="/curricula/nigerian" label="Nigerian Curriculum" onClose={closeAll} />
          <MobileLink href="/tutors" label="Find a Tutor" onClose={closeAll} />
          <p className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">Company</p>
          <MobileLink href="/about" label="About & Academic Leadership" onClose={closeAll} />
          <MobileLink href="/how-it-works" label="How It Works" onClose={closeAll} />
          <MobileLink href="/pricing" label="Pricing" onClose={closeAll} />
          <MobileLink href="/success-stories" label="Success Stories" onClose={closeAll} />
          <MobileLink href="/resources" label="Resources" onClose={closeAll} />
          <MobileLink href="/blog" label="Blog" onClose={closeAll} />
          <MobileLink href="/contact" label="Contact / Support" onClose={closeAll} />
          <p className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">Teach</p>
          <MobileLink href="/become-tutor" label="Become a Tutor" onClose={closeAll} />
          <MobileLink href="/tutor-dashboard" label="Tutor Dashboard" onClose={closeAll} />
        </div>
      )}
    </header>
  );
}

function MobileLink({ href, label, onClose }: { href: string; label: string; onClose: () => void }) {
  return (
    <Link href={href} onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
      {label}
    </Link>
  );
}
