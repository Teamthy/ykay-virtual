"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { listProgrammes } from "@/features/programmes/api/list";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";

export default function AdminProgrammesPage() {
  const programmes = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: () => listProgrammes({ page_size: 100 }),
    staleTime: 30_000,
  });
  const rows = programmes.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy flex items-center gap-2">
          <BookOpen className="text-brand-gold" /> Programmes
        </h1>
        <p className="text-ink-500 text-sm mt-1">Open a roster for cohorts, students and tutors on a programme.</p>
      </div>

      {programmes.isLoading ? (
        <p className="text-sm text-ink-500">Loading programmes…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="No programmes yet"
          description="Published programmes appear here with a link to the admin roster."
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white shadow-soft">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-bold text-ink-800">{p.title}</p>
                <p className="text-xs text-ink-500">{p.slug} · {p.format}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={p.status} kind={statusKindFor(p.status)} />
                <Link
                  href={`/admin/programmes/${p.slug}`}
                  className="rounded-full bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900"
                >
                  Open roster
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
