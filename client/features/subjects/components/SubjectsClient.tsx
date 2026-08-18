"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listSubjects } from "@/features/subjects/api/list";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All", "Academic", "Digital", "Languages", "Nigerian Languages", "Music", "Exam Preparation"];

const FALLBACK_SUBJECTS = [
  { id: "1", slug: "mathematics", name: "Mathematics", category: "Academic", description: "Core maths across British and Nigerian pathways." },
  { id: "2", slug: "english", name: "English Language", category: "Academic", description: "Comprehension, writing and oral." },
  { id: "3", slug: "physics", name: "Physics", category: "Academic", description: "Mechanics, waves, electricity." },
  { id: "4", slug: "chemistry", name: "Chemistry", category: "Academic", description: "Organic, inorganic and practicals." },
  { id: "5", slug: "biology", name: "Biology", category: "Academic", description: "Life sciences for SSS and IGCSE." },
  { id: "6", slug: "further-maths", name: "Further Mathematics", category: "Academic", description: "For A-Level and strong SSS candidates." },
  { id: "7", slug: "economics", name: "Economics", category: "Academic", description: "Micro, macro and exam technique." },
  { id: "8", slug: "accounting", name: "Accounting", category: "Academic", description: "Bookkeeping and financial statements." },
  { id: "9", slug: "computer-science", name: "Computer Science", category: "Digital", description: "Theory and programming for IGCSE/SSS." },
  { id: "10", slug: "/digital-skills", name: "Python Programming", category: "Digital", description: "First programs to small projects." },
  { id: "11", slug: "/digital-skills", name: "ICT & Digital Literacy", category: "Digital", description: "Practical computing for school and work." },
  { id: "12", slug: "/digital-skills", name: "Cybersecurity", category: "Digital", description: "Safe online habits and fundamentals." },
  { id: "13", slug: "french", name: "French", category: "Languages", description: "Beginner to exam oral practice." },
  { id: "14", slug: "yoruba", name: "Yoruba", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "15", slug: "igbo", name: "Igbo", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "16", slug: "hausa", name: "Hausa", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "17", slug: "music", name: "Music", category: "Music", description: "Theory and practical coaching." },
  { id: "18", slug: "/exam-prep", name: "WAEC / NECO prep", category: "Exam Preparation", description: "Past papers and mocks." },
  { id: "19", slug: "/utme-2026", name: "UTME / JAMB", category: "Exam Preparation", description: "Topic drills and CBT-style mocks." },
  { id: "20", slug: "/gmat", name: "GMAT / GRE", category: "Exam Preparation", description: "Diagnostic-led graduate test prep." },
].map((s, i) => ({
  ...s,
  photo: ["/hero/subjects.jpg", "/hero/exam-prep.jpg", "/hero/british.jpg", "/hero/nigerian.jpg", "/hero/digital.jpg"][i % 5],
}));

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
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            (subjects.data?.data ?? []).length > 0
              ? subjects.data!.data
              : FALLBACK_SUBJECTS.filter((s) => {
                  if (category !== "All" && s.category !== category) return false;
                  if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
                  return true;
                })
          ).map((s) => (
            <Link
              key={s.id}
              href={s.slug.startsWith("/") ? s.slug : `/subjects/${s.slug}`}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-cover bg-center p-5 text-white shadow-soft"
              style={{
                backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.82), rgba(1,57,32,0.55)), url(${s.photo ?? "/hero/subjects.jpg"})`,
              }}
            >
              <h3 className="font-bold text-white">{s.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/70">{s.category}</p>
              {s.description && <p className="mt-2 line-clamp-2 text-sm text-white/80">{s.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
