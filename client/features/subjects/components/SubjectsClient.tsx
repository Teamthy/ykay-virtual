"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listSubjects } from "@/features/subjects/api/list";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All", "Academic", "Digital", "Languages", "Nigerian Languages", "Music", "Exam Preparation"];

export function SubjectsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "All");

  const subjects = useQuery({
    queryKey: ["subjects", "list", search, category],
    queryFn: () =>
      listSubjects({
        search: search || undefined,
        category: category === "All" ? undefined : category,
        page: 1,
      }),
    staleTime: 180_000,
  });

  const selectCategory = (c: string) => {
    setCategory(c);
    const qs = new URLSearchParams();
    if (c !== "All") qs.set("category", c);
    if (search) qs.set("q", search);
    router.push(`/subjects?${qs.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const qs = new URLSearchParams();
              if (search) qs.set("q", search);
              if (category !== "All") qs.set("category", category);
              router.push(`/subjects?${qs.toString()}`, { scroll: false });
            }
          }}
          placeholder="Search subjects…"
          className="flex-1 max-w-sm rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => selectCategory(c)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                category === c ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {subjects.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : subjects.isError ? (
        <div className="border rounded-2xl p-10 text-center text-red-600">Could not load subjects.</div>
      ) : (subjects.data?.data ?? []).length === 0 ? (
        <div className="border rounded-2xl p-10 text-center text-ink-500">No subjects match your search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(subjects.data?.data ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/subjects/${s.slug}`}
              className="border rounded-2xl p-5 hover:border-brand-blue hover:shadow-lift transition-all"
            >
              <h3 className="font-bold">{s.name}</h3>
              <p className="text-xs text-ink-400 mt-1 uppercase tracking-wide">{s.category}</p>
              {s.description && <p className="text-sm text-ink-600 mt-2 line-clamp-2">{s.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
