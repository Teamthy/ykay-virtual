"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { LibraryCard } from "@/components/library/LibraryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { browseLibrary, featuredLibrary } from "@/features/library/api";

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const featured = useQuery({
    queryKey: ["library", "featured"],
    queryFn: () => featuredLibrary(8),
    staleTime: 5 * 60_000,
  });

  const catalogue = useQuery({
    queryKey: ["library", "browse", q, page],
    queryFn: () => browseLibrary({ q: q || undefined, page, page_size: 24 }),
    staleTime: 60_000,
  });

  const items = catalogue.data?.data ?? [];
  const meta = catalogue.data?.meta;
  const featuredItems = featured.data ?? [];

  const grid = useMemo(() => items, [items]);

  return (
    <main>
      <PageHero
        cover="/hero/programmes.jpg"
        eyebrow="Learn on demand"
        title="Recorded Lesson Library"
        subtitle="Rewatch expert-led recorded classes across British and Nigerian curricula, exam preparation and digital skills. Browse freely — watch when you're enrolled in the cohort."
        crumbs={[{ name: "Home", href: "/" }, { name: "Recorded Library" }]}
        align="center"
      />

      <div className="container-x py-12">
        {featuredItems.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
              <Sparkles className="text-brand-gold" /> Featured this week
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredItems.map((it) => (
                <LibraryCard key={it.lesson_id} item={it} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <Video className="text-brand-gold" /> All recorded lessons
            </h2>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
              }}
            >
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search lessons…"
                  className="w-64 rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </form>
          </div>

          {catalogue.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : grid.length === 0 ? (
            <EmptyState
              icon={<Video size={20} />}
              title="No recorded lessons found"
              description="Try a different search, or explore programmes to find a cohort with recorded content."
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {grid.map((it) => (
                  <LibraryCard key={it.lesson_id} item={it} />
                ))}
              </div>
              {meta && meta.total_pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-ink-500">
                    Page {page} of {meta.total_pages}
                  </span>
                  <button
                    disabled={!meta.has_next}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
