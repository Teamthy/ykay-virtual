"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listProgrammes } from "@/features/programmes/api/list";
import { Skeleton } from "@/components/ui/skeleton";

const FORMATS = ["All", "COHORT", "BOOTCAMP", "HOLIDAY", "ONLINE_CLASS", "HYBRID"];

export function ProgrammesClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const [format, setFormat] = useState(sp.get("format") ?? "All");

  const programmes = useQuery({
    queryKey: ["programmes", "list", search, format],
    queryFn: () =>
      listProgrammes({
        search: search || undefined,
        format: format === "All" ? undefined : format,
        page: 1,
        page_size: 24,
        sort: "newest",
      }),
    staleTime: 120_000,
  });

  const selectFormat = (f: string) => {
    setFormat(f);
    const qs = new URLSearchParams();
    if (f !== "All") qs.set("format", f);
    if (search) qs.set("q", search);
    router.push(`/programmes?${qs.toString()}`, { scroll: false });
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
              if (format !== "All") qs.set("format", format);
              router.push(`/programmes?${qs.toString()}`, { scroll: false });
            }
          }}
          placeholder="Search programmes…"
          className="flex-1 max-w-sm rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => selectFormat(f)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                format === f ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {f.replace(/_/g, " ").toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {programmes.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : programmes.isError ? (
        <div className="border rounded-2xl p-10 text-center text-red-600">Could not load programmes.</div>
      ) : (programmes.data?.data ?? []).length === 0 ? (
        <div className="border rounded-2xl p-10 text-center text-ink-500">
          No programmes match yet — new cohorts launch regularly.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(programmes.data?.data ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/programmes/${p.slug}`}
              className="border rounded-2xl p-6 hover:border-brand-blue hover:shadow-lift transition-all bg-white"
            >
              {p.is_featured && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-brand-gold bg-amber-50 px-2 py-0.5 rounded-full mb-2">
                  Featured
                </span>
              )}
              <h3 className="font-bold leading-snug">{p.title}</h3>
              {p.summary && <p className="text-sm text-ink-600 mt-2 line-clamp-2">{p.summary}</p>}
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="px-2 py-1 rounded-full bg-ink-100 text-ink-600">
                  {p.format.replace(/_/g, " ").toLowerCase()}
                </span>
                {p.price_min ? (
                  <span className="font-bold">
                    {p.currency} {p.price_min.toLocaleString()}
                    {p.price_max && p.price_max !== p.price_min ? `–${p.price_max.toLocaleString()}` : ""}
                  </span>
                ) : (
                  <span className="text-ink-400">Price on request</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
