"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ArrowRight, BookOpen, GraduationCap, MonitorPlay, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceGroup = {
  title: string;
  href: string;
  icon: ReactNode;
  items: { label: string; href: string }[];
};

/** Shared public IA: College, CBT, and a Services menu whose section titles are links. */
export const PRIMARY_LINKS = [
  { label: "College", href: "/college" },
  { label: "CBT", href: "/cbt" },
] as const;

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    title: "K-12 Academics",
    href: "/hometutors",
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
    href: "/exam-prep",
    icon: <BookOpen size={14} />,
    items: [
      { label: "Exam preparation", href: "/exam-prep" },
      { label: "CBT practice", href: "/cbt" },
      { label: "UTME 2026 Prep", href: "/utme-2026" },
      { label: "GMAT Prep", href: "/gmat" },
      { label: "SAT / GRE", href: "/test-prep" },
      { label: "Entrance Exams", href: "/entrance-exam" },
    ],
  },
  {
    title: "Training & Digital",
    href: "/digital-skills",
    icon: <MonitorPlay size={14} />,
    items: [
      { label: "Digital Skills", href: "/digital-skills" },
      { label: "Programmes", href: "/programmes" },
      { label: "Subjects", href: "/subjects" },
    ],
  },
  {
    title: "The Ykay family",
    href: "/college",
    icon: <Star size={14} />,
    items: [
      { label: "Ykay College", href: "/college" },
      { label: "YK-Virtual Plus", href: "/plus" },
      { label: "Pricing", href: "/pricing" },
      { label: "Become a tutor", href: "/become-tutor" },
    ],
  },
];

export function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function ServicesToggle({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
        open ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
        className,
      )}
      aria-expanded={open}
      aria-controls="services-menu"
      aria-haspopup="true"
    >
      Services
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={cn("size-3.5 transition", open && "rotate-180")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function ServicesPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div
      id="services-menu"
      role="region"
      aria-label="Services"
      className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_16px_60px_rgba(15,42,26,0.15)]"
    >
      <div className="grid sm:grid-cols-[1.4fr_0.6fr]">
        <div className="grid grid-cols-2 gap-1 p-4">
          {SERVICE_GROUPS.map((g) => (
            <div key={g.title} className="rounded-[14px] bg-[#F9F6ED]/70 p-3">
              <Link
                href={g.href}
                onClick={onNavigate}
                className="flex items-center gap-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A] hover:underline"
              >
                <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white">{g.icon}</span>
                {g.title}
              </Link>
              <div className="mt-2 space-y-0.5">
                {g.items.map((it) => (
                  <Link
                    key={it.label}
                    href={it.href}
                    onClick={onNavigate}
                    className="block rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#0F2A1A]/70 hover:bg-white hover:text-[#0F2A1A]"
                  >
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
          <img src="/home/campus-hero.jpg" alt="" className="mt-3 h-32 w-full rounded-[12px] object-cover" />
          <p className="mt-3 text-[12px] leading-relaxed text-white/75">
            Two schools, one family — campus in Sango Ota, live classes and CBT online.
          </p>
          <Link
            href="/college"
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#D6FF57] px-4 py-2 text-[12px] font-bold text-[#0F2A1A]"
          >
            Visit Ykay College <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ServicesDropdown({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="pointer-events-auto absolute left-1/2 top-full z-30 mt-3 w-[min(92vw,820px)] -translate-x-1/2">
      <ServicesPanel onNavigate={onClose} />
    </div>
  );
}

export function MobileServiceGroups({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mt-2 space-y-3 border-t border-white/10 pt-3">
      {SERVICE_GROUPS.map((g) => (
        <div key={g.title}>
          <Link
            href={g.href}
            onClick={onNavigate}
            className="block rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-[#D6FF57]"
          >
            {g.title}
          </Link>
          <div className="grid grid-cols-2 gap-1">
            {g.items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                onClick={onNavigate}
                className="rounded-xl px-3 py-2 text-[12px] font-semibold text-white/75 hover:bg-white/10 hover:text-white"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
