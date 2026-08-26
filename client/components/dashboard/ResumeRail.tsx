"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";

type ResumeItem = {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
};

/** "Continue where you left off" rail (Duolingo/Khan standard). */
export function ResumeRail({ items }: { items: ResumeItem[] }) {
  const visible = (items ?? []).slice(0, 3);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary-light p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-deep">
        <PlayCircle size={16} /> Continue where you left off
      </h3>
      <div className="mt-3 space-y-2">
        {visible.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm transition-colors hover:border-primary/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-800">{it.title}</p>
              {it.subtitle && <p className="truncate text-xs text-ink-500">{it.subtitle}</p>}
            </div>
            <span className="ml-3 shrink-0 text-xs font-bold text-brand-blue">Resume →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
