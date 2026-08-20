"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Users, UserCheck, CalendarDays } from "lucide-react";
import { getProgrammeRoster, type ProgrammeRoster } from "@/features/admin/api";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminProgrammeRosterPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const q = useQuery({
    queryKey: ["admin", "programme-roster", slug],
    queryFn: () => getProgrammeRoster(slug),
    enabled: !!slug,
    staleTime: 15_000,
  });

  if (q.isLoading) {
    return <p className="text-sm text-ink-500">Loading roster…</p>;
  }
  if (q.isError || !q.data) {
    return (
      <EmptyState
        icon={<BookOpen size={20} />}
        title="Programme not found"
        description="Check the slug or publish the programme first."
      />
    );
  }

  const roster: ProgrammeRoster = q.data;
  const programme = roster.programme;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/programmes" className="text-xs font-semibold text-brand-navy hover:underline">
            ← All programmes
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">{programme.title}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {programme.slug} · {programme.format}
            {programme.summary ? ` — ${programme.summary}` : ""}
          </p>
        </div>
        <StatusBadge label={programme.status} kind={statusKindFor(programme.status)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-500"><CalendarDays size={14} /> Cohorts</div>
          <div className="mt-1 text-2xl font-extrabold text-brand-navy">{roster.cohort_count}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-500"><Users size={14} /> Students</div>
          <div className="mt-1 text-2xl font-extrabold text-brand-navy">{roster.student_count}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-500"><UserCheck size={14} /> Tutors</div>
          <div className="mt-1 text-2xl font-extrabold text-brand-navy">{roster.tutors.length}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="font-bold text-brand-navy">Cohorts</h2>
        {(roster.cohorts ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No cohorts on this programme yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {(roster.cohorts ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-800">{c.title}</p>
                  <p className="text-xs text-ink-500">
                    {c.code ? `${c.code} · ` : ""}
                    {c.enrolled_count}/{c.capacity} enrolled
                  </p>
                </div>
                <StatusBadge label={c.status} kind={statusKindFor(c.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="font-bold text-brand-navy">Tutors</h2>
        {(roster.tutors ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No tutor assigned yet — assign from Cohorts or approve a join request.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {(roster.tutors ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-800">{t.display_name}</p>
                  <p className="text-xs text-ink-500">{t.slug}{t.is_public ? " · public" : ""}</p>
                </div>
                <StatusBadge label={t.status} kind={statusKindFor(t.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="font-bold text-brand-navy">Students</h2>
        {(roster.students ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No enrolments on this programme yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {(roster.students ?? []).map((s) => (
              <li key={`${s.id}-${s.cohort_id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-800">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-ink-500">{s.current_level || "—"}</p>
                </div>
                <StatusBadge label={s.status} kind={statusKindFor(s.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
