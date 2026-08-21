"use client";

// useSubjectNames — resolves subject_id → display name from the public
// catalogue, so exam cards can carry "Mathematics" instead of a UUID.
// One shared query; components reuse the same cache key.

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type SubjectRef = { id: string; name: string; slug: string };

export function useSubjectNames() {
  const q = useQuery({
    queryKey: ["catalogue", "subjects"],
    queryFn: async () => {
      const res = await apiFetch<SubjectRef[]>("/subjects?page_size=200");
      return res.data ?? [];
    },
    staleTime: 10 * 60_000,
  });
  const map: Record<string, string> = {};
  for (const s of q.data ?? []) {
    map[s.id] = s.name;
  }
  return { ...q, map };
}

export function subjectName(map: Record<string, string>, id?: string): string {
  return id ? map[id] ?? "Exam" : "Exam";
}
