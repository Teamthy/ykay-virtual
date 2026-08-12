"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchTutors, type SearchParams } from "@/features/tutors/api/search";
import { TutorCard } from "@/features/tutors/components/TutorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

/**
 * TutorsSearchClient — URL-driven filters (SSR-compatible state), infinite
 * scroll via TanStack Query useInfiniteQuery (AGENTS.md), loading/empty/error
 * states on every view.
 */
export function TutorsSearchClient({ initialSubject }: { initialSubject?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [subject, setSubject] = useState(initialSubject ?? sp.get("subject") ?? "");
  const [online, setOnline] = useState<boolean>(sp.get("online") === "true");
  const [inPerson, setInPerson] = useState<boolean>(sp.get("in_person") === "true");
  const [minPrice, setMinPrice] = useState(sp.get("min_price") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "ranking_score");

  const params: SearchParams = useMemo(() => {
    const p: SearchParams = { sort, page_size: 12 };
    if (subject) p.subject = subject;
    if (online) p.online = true;
    if (inPerson) p.in_person = true;
    if (minPrice) p.min_price = Number(minPrice);
    return p;
  }, [subject, online, inPerson, minPrice, sort]);

  const applyFilters = (next: Record<string, unknown>) => {
    const qs = new URLSearchParams();
    const merged = { subject, online, in_person: inPerson, min_price: minPrice, sort, ...next };
    if (merged.subject) qs.set("subject", String(merged.subject));
    if (merged.online) qs.set("online", "true");
    if (merged.in_person) qs.set("in_person", "true");
    if (merged.min_price) qs.set("min_price", String(merged.min_price));
    qs.set("sort", String(merged.sort));
    router.push(`/tutors?${qs.toString()}`, { scroll: false });
  };

  const query = useInfiniteQuery({
    queryKey: ["tutors", "search", params],
    queryFn: ({ pageParam = 1 }) => searchTutors({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const meta = last.meta;
      return meta && meta.has_next ? meta.page + 1 : undefined;
    },
    staleTime: 60_000,
  });

  const tutors = query.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
      {/* Filters */}
      <aside className="border rounded-2xl p-5 space-y-5 lg:sticky lg:top-28">
        <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Filters</h2>
        <label className="block text-sm">
          <span className="font-medium">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ subject })}
            placeholder="e.g. mathematics"
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
          />
        </label>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={online} onChange={(e) => { setOnline(e.target.checked); applyFilters({ online: e.target.checked }); }} />
            Online lessons
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inPerson} onChange={(e) => { setInPerson(e.target.checked); applyFilters({ in_person: e.target.checked }); }} />
            In-person lessons
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Min hourly rate (₦)</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => applyFilters({ min_price: minPrice })}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Sort</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); applyFilters({ sort: e.target.value }); }}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
          >
            <option value="ranking_score">Best match</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <Button variant="outline" size="sm" className="w-full" onClick={() => {
          setSubject(""); setOnline(false); setInPerson(false); setMinPrice("");
          router.push("/tutors", { scroll: false });
        }}>
          Clear filters
        </Button>
      </aside>

      {/* Results */}
      <div>
        {query.isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="border rounded-2xl p-10 text-center text-red-600">
            Could not load tutors. Please try again.
          </div>
        ) : tutors.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No tutors match your filters yet"
            description="New vetted tutors join weekly — try widening your subject or rate filters."
          />
        ) : (
          <>
            <p className="text-sm text-ink-500 mb-4">
              {query.data?.pages[0]?.meta?.total_items ?? tutors.length} tutor(s) found
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {tutors.map((t) => (
                <TutorCard key={t.id} tutor={t} />
              ))}
            </div>
            {query.hasNextPage && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? "Loading…" : "Load more tutors"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
