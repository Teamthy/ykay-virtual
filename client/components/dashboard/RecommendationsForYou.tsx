"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// RecommendationsForYou — the suggestions engine's UI (G6 polish): cohorts,
// programmes and tutors ranked against the session user's learners, each
// with a server-computed reason. Renders a compact "For you" shelf that
// drops gracefully into any dashboard.

export type RecCohort = {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  fee: number;
  currency: string;
  enrolled_count: number;
  capacity: number;
  reason: string;
};

export type RecProgramme = {
  id: string;
  title: string;
  slug: string;
  reason: string;
};

export type RecTutor = {
  profile: {
    id: string;
    slug: string;
    display_name: string;
    rating_avg: number;
    rating_count: number;
  };
  subjects?: string[] | null;
};

export type Recommendations = {
  cohorts: RecCohort[];
  programmes: RecProgramme[];
  tutors: RecTutor[];
  basis: string;
};

async function fetchRecommendations(): Promise<Recommendations | null> {
  try {
    const res = await apiFetch<Recommendations>("/me/recommendations");
    return res.data ?? null;
  } catch {
    return null;
  }
}

export function RecommendationsForYou() {
  const recs = useQuery({
    queryKey: ["recommendations"],
    queryFn: fetchRecommendations,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (recs.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  const data = recs.data;
  if (!data || (data.cohorts.length === 0 && data.programmes.length === 0 && data.tutors.length === 0)) {
    return null; // no personalisation available — dashboards render without it
  }

  return (
    <section aria-label="Recommended for you" className="mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-navy">For you</h2>
          <p className="text-xs text-ink-500 mt-0.5">{data.basis}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Cohorts */}
        {data.cohorts.length > 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Cohorts starting soon</p>
            <ul className="space-y-2">
              {data.cohorts.slice(0, 2).map((c) => (
                <li key={c.id}>
                  <Link href={`/cohorts/${c.id}`} className="group block">
                    <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-blue">
                      {c.title}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {c.reason} · {c.enrolled_count}/{c.capacity} enrolled
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Programmes */}
        {data.programmes.length > 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Programmes for your level</p>
            <ul className="space-y-2">
              {data.programmes.slice(0, 2).map((p) => (
                <li key={p.id}>
                  <Link href={`/programmes/${p.slug ?? p.id}`} className="group block">
                    <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-blue">
                      {p.title}
                    </span>
                    <span className="block text-xs text-ink-500">{p.reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tutors */}
        {data.tutors.length > 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Top-rated tutors</p>
            <ul className="space-y-2">
              {data.tutors.slice(0, 2).map((t) => (
                <li key={t.profile.id}>
                  <Link href={`/tutors/${t.profile.slug ?? t.profile.id}`} className="group block">
                    <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-blue">
                      {t.profile.display_name}
                    </span>
                    <span className="block text-xs text-ink-500">
                      ★ {(t.profile.rating_avg ?? 0).toFixed(1)} · {(t.subjects ?? []).slice(0, 2).join(", ") || "Verified tutor"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
