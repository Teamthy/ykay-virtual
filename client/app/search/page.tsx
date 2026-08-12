"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { INPUT_CLS } from "@/components/ui/password-input";
import { searchTutors, type Tutor } from "@/features/tutors/api/search";
import { listProgrammes, type Programme } from "@/features/programmes/api/list";
import { listSubjects } from "@/features/subjects/api/list";
import { useWishlist } from "@/features/wishlist/hook";

// /search — site-wide search (P0): tutors (free-text), programmes and
// subjects in one place. Header search navigates here.

type ResultGroup = "tutors" | "programmes" | "subjects";

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [activeGroup, setActiveGroup] = useState<ResultGroup>("tutors");
  const { isSaved, toggle } = useWishlist();

  useEffect(() => setInput(q), [q]);

  const tutors = useQuery({
    queryKey: ["search", "tutors", q],
    queryFn: () => searchTutors({ q, page_size: 8 }),
    enabled: q.length > 1,
  });
  const programmes = useQuery({
    queryKey: ["search", "programmes", q],
    queryFn: () => listProgrammes({ search: q, page_size: 8 }),
    enabled: q.length > 1,
  });
  const subjects = useQuery({
    queryKey: ["search", "subjects", q],
    queryFn: () => listSubjects({ search: q }),
    enabled: q.length > 1,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const tutorCount = tutors.data?.data?.length ?? 0;
  const programmeCount = programmes.data?.data?.length ?? 0;
  const subjectCount = subjects.data?.data?.length ?? 0;

  const groups: { key: ResultGroup; label: string; count: number }[] = [
    { key: "tutors", label: "Tutors", count: tutorCount },
    { key: "programmes", label: "Programmes", count: programmeCount },
    { key: "subjects", label: "Subjects", count: subjectCount },
  ];

  return (
    <main className="min-h-screen bg-[#FFFCF5] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">NUVORA</Link> / Search
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">
            Search NUVORA
          </h1>
          <form onSubmit={submit} className="mt-4 flex max-w-2xl gap-2">
            <input
              type="search"
              autoFocus
              placeholder="Try “mathematics”, “UTME”, “Lagos tutor”…"
              className={INPUT_CLS}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand-gold px-6 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        {!q ? (
          <p className="py-16 text-center text-ink-400">Type above to search tutors, programmes and subjects.</p>
        ) : q.length <= 1 ? (
          <p className="py-16 text-center text-ink-400">Keep typing — search needs at least 2 characters.</p>
        ) : (
          <>
            {/* Group tabs */}
            <div className="mt-6 flex gap-2">
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(g.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                    activeGroup === g.key ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                  }`}
                >
                  {g.label} ({g.count})
                </button>
              ))}
            </div>

            <div className="mt-4">
              {activeGroup === "tutors" && (
                <div className="space-y-3">
                  {(tutors.data?.data ?? []).map((t: Tutor) => {
                    const saved = isSaved(t.slug);
                    return (
                      <div key={t.id} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-ink-700 dark:bg-[#141C2E]">
                        <Link href={`/tutors/${t.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gold-light font-bold text-brand-navy">
                            {t.display_name.slice(0, 1)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-brand-navy dark:text-white">{t.display_name}</span>
                            <span className="block truncate text-sm text-ink-500">
                              {(t.subjects ?? []).map((s) => s.name).join(" · ") || "Tutor"}
                              {t.rating_avg > 0 ? ` · ★ ${t.rating_avg.toFixed(1)}` : ""}
                            </span>
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            toggle({
                              slug: t.slug,
                              name: t.display_name,
                              subjects: (t.subjects ?? []).map((s) => s.name),
                              rating: t.rating_avg,
                            })
                          }
                          aria-label={saved ? `Remove ${t.display_name} from saved` : `Save ${t.display_name}`}
                          aria-pressed={saved}
                          className={`grid size-9 shrink-0 place-items-center rounded-full text-lg transition-transform hover:scale-110 ${saved ? "bg-red-50" : "bg-ink-50"}`}
                        >
                          {saved ? "❤️" : "🤍"}
                        </button>
                      </div>
                    );
                  })}
                  {tutorCount === 0 && <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">No tutors match “{q}”.</p>}
                </div>
              )}

              {activeGroup === "programmes" && (
                <div className="space-y-3">
                  {(programmes.data?.data ?? []).map((p: Programme) => (
                    <Link
                      key={p.id}
                      href={`/programmes/${p.slug}`}
                      className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div>
                        <p className="font-bold text-brand-navy">{p.title}</p>
                        <p className="text-sm text-ink-500">{p.format} programme</p>
                      </div>
                      <span className="text-xs font-bold text-brand-gold-dark">View →</span>
                    </Link>
                  ))}
                  {programmeCount === 0 && <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">No programmes match “{q}”.</p>}
                </div>
              )}

              {activeGroup === "subjects" && (
                <div className="flex flex-wrap gap-3">
                  {(subjects.data?.data ?? []).map((s) => (
                    <Link
                      key={s.id}
                      href={`/subjects/${s.slug}`}
                      className="rounded-2xl border border-ink-100 bg-white px-5 py-3 font-semibold text-brand-navy shadow-sm hover:border-brand-gold"
                    >
                      {s.name}
                    </Link>
                  ))}
                  {subjectCount === 0 && <p className="w-full rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">No subjects match “{q}”.</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-ink-400">Loading…</p>}>
      <SearchInner />
    </Suspense>
  );
}
