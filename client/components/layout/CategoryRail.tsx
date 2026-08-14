"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpenCheck, MonitorPlay, GraduationCap, Globe2, Star, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Category rail — reference-grade left navigation used on product pages
// (Home Tutoring · UTME 2026 · GMAT Prep · Healthcare · Entrance Exam ·
// Study Abroad · Tuteria Plus · Languages equivalent, mapped to NUVORA pages).

const CATEGORIES = [
  { label: "Home Tutoring", href: "/hometutors", icon: <Home size={16} /> },
  { label: "UTME 2026 Prep", href: "/utme-2026", icon: <FileCheck size={16} /> },
  { label: "GMAT Prep", href: "/gmat", icon: <GraduationCap size={16} /> },
  { label: "Entrance Exams", href: "/entrance-exam", icon: <BookOpenCheck size={16} /> },
  { label: "Test Prep", href: "/test-prep", icon: <FileCheck size={16} /> },
  { label: "Online Classes", href: "/online-classes", icon: <MonitorPlay size={16} /> },
  { label: "Study Abroad", href: "/study-abroad", icon: <Globe2 size={16} /> },
  { label: "NUVORA Plus", href: "/nuvora-plus", icon: <Star size={16} /> },
];

export function CategoryRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Categories" className="rounded-2xl border border-ink-100 bg-white p-2 shadow-soft">
      <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">Categories</p>
      <ul className="space-y-0.5">
        {CATEGORIES.map((c) => {
          const active = pathname === c.href;
          return (
            <li key={`${c.label}-${c.href}`}>
              <Link
                href={c.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-brand-gold text-ink-900" : "text-ink-700 hover:bg-ink-100"
                )}
              >
                <span className={cn(active ? "text-ink-900" : "text-brand-blue")}>{c.icon}</span>
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
