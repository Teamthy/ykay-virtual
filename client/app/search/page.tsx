"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { Heart, Loader2, SlidersHorizontal } from "lucide-react";
import { INPUT_CLS } from "@/components/ui/password-input";
import { searchTutors, type Tutor } from "@/features/tutors/api/search";
import { listProgrammes, type Programme } from "@/features/programmes/api/list";
import { listSubjects, type Subject } from "@/features/subjects/api/list";
import { useWishlist } from "@/features/wishlist/hook";

// /search - site-wide search (P0): tutors (free-text + subject + online
// filter), programmes and subjects in one place. Debounced as-you-type,
// URL-synced, with loading states and empty states.

type ResultGroup = "tutors" | "programmes" | "subjects";

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [debounced, setDebounced] = useState(q);
  const [activeGroup, setActiveGroup] = useState<ResultGroup>("tutors");
  const [subject, setSubject] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const { isSaved, toggle } = useWishlist();

  // Sync from URL (back/forward, header search).
  useEffect(() => setInput(q), [q]);

  // Debounce typing → debounced query.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const activeQ = debounced.length > 1 ? debounced : "";

  const tutors = useQuery({
    queryKey: ["search", "tutors", activeQ, subject, onlineOnly],
    queryFn: () =>
      searchTutors({
        q: activeQ || undefined,
        subject: subject || undefined,
        online: onlineOnly || undefined,
        page_size: 8,
      }),
    enabled: activeQ.length > 0,
  });
  const programmes = useQuery({
    queryKey: ["search", "programmes", activeQ],
    queryFn: () => listProgrammes({ search: activeQ, page_size: 8 }),
    enabled: activeQ.length > 0,
  });
  const subjects = useQuery({
    queryKey: ["search", "subjects", activeQ],
    queryFn: () => listSubjects({ search: activeQ }),
    enabled: activeQ.length > 0,
  });
  // All subjects, once, for the tutor filter dropdown.
  const allSubjects = useQuery({
    queryKey: ["subjects", "all"],
    queryFn: () => listSubjects({ page_size: 100 }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const tutorCount = tutors.data?.data?.length ?? 0;
  const programmeCount = programmes.data?.data?.length ?? 0;
  const subjectCount = subjects.data?.data?.length ?? 0;
  const anyLoading =
    tutors.isFetching || programmes.isFetching || subjects.isFetching;

  const groups: { key: ResultGroup; label: string; count: number }[] = [
    { key: "tutors", label: "Tutors", count: tutorCount },
    { key: "programmes", label: "Programmes", count: programmeCount },
    { key: "subjects", label: "Subjects", count: subjectCount },
  ];

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">
              YK-Virtual
            </Link>{" "}
            / Search
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">
            Search YK-Virtual
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
        {!activeQ ? (
          <p className="py-16 text-center text-ink-400">
            {debounced.length === 1
              ? "Keep typing - search needs at least 2 characters."
              : "Type above to search tutors, programmes and subjects."}
          </p>
        ) : (
          <>
            {/* Group tabs */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(g.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                    activeGroup === g.key
                      ? "bg-brand-gold text-ink-900"
                      : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                  }`}
                >
                  {g.label} ({g.count})
                </button>
              ))}
              {anyLoading && (
                <Loader2 size={15} className="animate-spin text-ink-400" />
              )}
            </div>

            {/* Tutor filters */}
            {activeGroup === "tutors" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3">
                <SlidersHorizontal size={15} className="text-ink-400" />
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-ink-500">Subject</span>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 focus:border-brand-gold focus:outline-none"
                  >
                    <option value="">All subjects</option>
                    {(allSubjects.data?.data ?? []).map((s: Subject) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="size-4 accent-[#013920]"
                  />
                  Online only
                </label>
              </div>
            )}

            <div className="mt-4">
              {activeGroup === "tutors" && (
                <div className="space-y-3">
                  {(tutors.data?.data ?? []).map((t: Tutor) => {
                    const saved = isSaved(t.slug);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Link
                          href={`/tutors/${t.slug}`}
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gold-light font-bold text-brand-navy">
                            {t.display_name.slice(0, 1)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-brand-navy">
                              {t.display_name}
                            </span>
                            <span className="block truncate text-sm text-ink-500">
                              {(t.subjects ?? [])
                                .map((s) => s.name)
                                .join(" · ") || "Tutor"}
                              {t.rating_avg > 0
                                ? ` · ★ ${t.rating_avg.toFixed(1)}`
                                : ""}
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
                          aria-label={
                            saved
                              ? `Remove ${t.display_name} from saved`
                              : `Save ${t.display_name}`
                          }
                          aria-pressed={saved}
                          className={`grid size-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-110 ${saved ? "bg-red-50" : "bg-ink-50"}`}
                        >
                          <Heart
                            size={17}
                            className={
                              saved
                                ? "fill-red-500 text-red-500"
                                : "text-ink-400"
                            }
                          />
                        </button>
                      </div>
                    );
                  })}
                  {tutorCount === 0 && !anyLoading && (
                    <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
                      No tutors match “{activeQ}”
                      {subject || onlineOnly ? " with those filters" : ""}. Try
                      a broader term.
                    </p>
                  )}
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
                        <p className="text-sm text-ink-500">
                          {p.format} programme
                        </p>
                      </div>
                      <span className="text-xs font-bold text-brand-gold-dark">
                        View →
                      </span>
                    </Link>
                  ))}
                  {programmeCount === 0 && !anyLoading && (
                    <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
                      No programmes match “{activeQ}”.
                    </p>
                  )}
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
                  {subjectCount === 0 && !anyLoading && (
                    <p className="w-full rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
                      No subjects match “{activeQ}”.
                    </p>
                  )}
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
    <Suspense
      fallback={<p className="py-24 text-center text-ink-400">Loading…</p>}
    >
      <SearchInner />
    </Suspense>
  );
}
