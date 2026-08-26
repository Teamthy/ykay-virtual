"use client";

import Link from "next/link";
import { Clock, Lock, Play, Video } from "lucide-react";
import type { LibraryItem } from "@/features/library/api";
import { formatDuration, formatRecordedDate } from "@/lib/format";

/** A single recorded-lesson card for the on-demand library catalogue. */
export function LibraryCard({ item }: { item: LibraryItem }) {
  const locked = !item.entitled;
  const href = `/library/${item.lesson_id}`;
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-card"
    >
      <div className="relative h-36 w-full overflow-hidden bg-deep">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deep via-brand-navy to-ink-700">
            <Video className="text-white/30" size={40} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              locked ? "bg-ink-700/80 text-white" : "bg-brand-gold text-deep"
            }`}
          >
            {locked ? <Lock size={20} /> : <Play size={20} className="ml-0.5" />}
          </span>
        </div>
        {item.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-deep">
            Featured
          </span>
        )}
        {item.duration_seconds ? (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            <Clock size={11} /> {formatDuration(item.duration_seconds)}
          </span>
        ) : null}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/90">
          {formatRecordedDate(item.start_at)}
        </span>
      </div>

      <div className="space-y-1.5 p-4">
        <h3 className="line-clamp-1 text-sm font-bold text-ink-900">{item.title}</h3>
        {item.programme_title && (
          <p className="line-clamp-1 text-xs text-ink-500">{item.programme_title}</p>
        )}
        {item.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.subjects.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
