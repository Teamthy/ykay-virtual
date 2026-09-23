"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchTutors, type SearchParams } from "@/features/tutors/api/search";
import { TutorCard } from "@/features/tutors/components/TutorCard";
import { TutorRowSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Users } from "lucide-react";

export function TutorsSearchClient({ initialSubject }: { initialSubject?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [subject, setSubject] = useState(initialSubject ?? sp.get("subject") ?? "");
  const [online, setOnline] = useState<boolean>(sp.get("online") === "true");
  const [inPerson, setInPerson] = useState<boolean>(sp.get("in_person") === "true");
  const [sort, setSort] = useState(sp.get("sort") ?? "ranking_score");

  const params: SearchParams = useMemo(() => {
    const p: SearchParams = { sort, page_size: 16 };
    if (q) p.q = q;
    if (subject) p.subject = subject;
    if (online) p.online = true;
    if (inPerson) p.in_person = true;
    return p;
  }, [q, subject, online, inPerson, sort]);

  const applyFilters = (next: Record<string, unknown>) => {
    const qs = new URLSearchParams();
    const merged = { q, subject, online, in_person: inPerson, sort, ...next };
    if (merged.q) qs.set("q", String(merged.q));
    if (merged.subject) qs.set("subject", String(merged.subject));
    if (merged.online) qs.set("online", "true");
    if (merged.in_person) qs.set("in_person", "true");
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
    staleTime: 0,
  });

  const tutors = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta?.total_items ?? tutors.length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-soft">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ q, subject });
          }}
        >
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F2A1A]/65" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-xl border border-black/10 py-2.5 pl-10 pr-3 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30"
            />
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g. mathematics)"
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30 md:w-56"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm md:w-44"
          >
            <option value="ranking_score">Best match</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
            <option value="newest">Newest</option>
          </select>
          <Button type="submit" variant="gold" size="sm" className="md:shrink-0">
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOnline(!online);
              applyFilters({ online: !online });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              online ? "bg-[#0F2A1A] text-white" : "bg-[#F9F6ED] text-[#0F2A1A]/70"
            }`}
          >
            Online
          </button>
          <button
            type="button"
            onClick={() => {
              setInPerson(!inPerson);
              applyFilters({ in_person: !inPerson });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              inPerson ? "bg-[#0F2A1A] text-white" : "bg-[#F9F6ED] text-[#0F2A1A]/70"
            }`}
          >
            In person
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-[#0F2A1A]/65 hover:text-[#0F2A1A]"
            onClick={() => {
              setQ("");
              setSubject("");
              setOnline(false);
              setInPerson(false);
              router.push("/tutors", { scroll: false });
            }}
          >
            Clear
          </button>
          <span className="ml-auto text-xs text-[#0F2A1A]/65">{query.isLoading ? "Searching…" : `${total} tutor(s)`}</span>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <TutorRowSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
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
          <div className="grid gap-2 md:grid-cols-2">
            {tutors.map((t) => (
              <TutorCard key={t.id} tutor={t} />
            ))}
          </div>
          {query.hasNextPage && (
            <div className="pt-2 text-center">
              <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Loading…" : "Load more tutors"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
