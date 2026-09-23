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
    <main className="min-h-screen bg-[#F9F6ED] pb-16">
      <header className="bg-[#0F2A1A] text-white">
        <div className="container-x py-12 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            <Link href="/" className="text-white/70 hover:text-[#D6FF57]">
              YK-Virtual
            </Link>{" "}
            / Search
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.5rem)] uppercase tracking-[-0.02em] text-white">
            Search YK-Virtual
          </h1>
          <form onSubmit={submit} className="mt-7 flex max-w-3xl flex-wrap gap-2 sm:flex-nowrap">
            <input
              type="search"
              autoFocus
              placeholder="Try “mathematics”, “UTME”, “Lagos tutor”…"
              className={`${INPUT_CLS} min-w-0 flex-1 rounded-full bg-white text-[#0F2A1A]`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[#D6FF57] px-7 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <div className="container-x py-6">
        {!activeQ ? (
          <p className="py-16 text-center text-[#0F2A1A]/65">
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
                      ? "bg-[#D6FF57] text-[#0F2A1A]"
                      : "bg-[#F9F6ED] text-[#0F2A1A]/65 hover:bg-[#F9F6ED]"
                  }`}
                >
                  {g.label} ({g.count})
                </button>
              ))}
              {anyLoading && (
                <Loader2 size={15} className="animate-spin text-[#0F2A1A]/65" />
              )}
            </div>

            {/* Tutor filters */}
            {activeGroup === "tutors" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
                <SlidersHorizontal size={15} className="text-[#0F2A1A]/65" />
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-[#0F2A1A]/65">Subject</span>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-[#0F2A1A]/75 focus:border-[#D6FF57] focus:outline-none"
                  >
                    <option value="">All subjects</option>
                    {(allSubjects.data?.data ?? []).map((s: Subject) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0F2A1A]/75">
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="size-4 accent-[#0F2A1A]"
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
                        className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Link
                          href={`/tutors/${t.slug}`}
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#F9F6ED] font-bold text-[#0F2A1A]">
                            {t.display_name.slice(0, 1)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-[#0F2A1A]">
                              {t.display_name}
                            </span>
                            <span className="block truncate text-sm text-[#0F2A1A]/65">
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
                          className={`grid size-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-110 ${saved ? "bg-red-50" : "bg-[#F9F6ED]"}`}
                        >
                          <Heart
                            size={17}
                            className={
                              saved
                                ? "fill-red-500 text-red-500"
                                : "text-[#0F2A1A]/65"
                            }
                          />
                        </button>
                      </div>
                    );
                  })}
                  {tutorCount === 0 && !anyLoading && (
                    <p className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center text-sm text-[#0F2A1A]/65">
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
                      className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div>
                        <p className="font-bold text-[#0F2A1A]">{p.title}</p>
                        <p className="text-sm text-[#0F2A1A]/65">
                          {p.format} programme
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#0F2A1A]">
                        View →
                      </span>
                    </Link>
                  ))}
                  {programmeCount === 0 && !anyLoading && (
                    <p className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center text-sm text-[#0F2A1A]/65">
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
                      className="rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-[#0F2A1A] shadow-sm hover:border-[#D6FF57]"
                    >
                      {s.name}
                    </Link>
                  ))}
                  {subjectCount === 0 && !anyLoading && (
                    <p className="w-full rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center text-sm text-[#0F2A1A]/65">
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
      fallback={<p className="py-24 text-center text-[#0F2A1A]/65">Loading…</p>}
    >
      <SearchInner />
    </Suspense>
  );
}
