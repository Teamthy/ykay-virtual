"use client";

import { apiFetch, Envelope } from "@/lib/api";

export type LibraryItem = {
  lesson_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  transcript?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  visible: boolean;
  featured: boolean;
  sort_order: number;
  start_at: string;
  cohort_id?: string | null;
  cohort_title?: string | null;
  cohort_slug?: string | null;
  programme_id?: string | null;
  programme_title?: string | null;
  programme_slug?: string | null;
  curriculum_name?: string | null;
  level_name?: string | null;
  subjects: string[];
  entitled: boolean;
};

export type LibraryFilter = {
  q?: string;
  featured?: boolean;
  programme_id?: string;
  subject_id?: string;
  level_id?: string;
  curriculum_id?: string;
  page?: number;
  page_size?: number;
};

function qs(f: LibraryFilter): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.featured) p.set("featured", "true");
  for (const k of ["programme_id", "subject_id", "level_id", "curriculum_id"] as const) {
    if (f[k]) p.set(k, f[k]!);
  }
  if (f.page) p.set("page", String(f.page));
  if (f.page_size) p.set("page_size", String(f.page_size));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Public browse of the on-demand recorded-lesson catalogue. */
export async function browseLibrary(filter: LibraryFilter = {}): Promise<Envelope<LibraryItem[]>> {
  return apiFetch<LibraryItem[]>(`/library${qs(filter)}`);
}

/** Featured rail (homepage / library hero). Metadata only. */
export async function featuredLibrary(page_size = 8): Promise<LibraryItem[]> {
  const res = await apiFetch<LibraryItem[]>(`/library/featured?page_size=${page_size}`);
  return res.data ?? [];
}

/** Recorded-lesson detail. video_url/transcript present only when entitled. */
export async function getLibraryItem(lessonId: string): Promise<LibraryItem> {
  const res = await apiFetch<LibraryItem>(`/library/${lessonId}`);
  return res.data;
}

export type LibraryMetaInput = {
  visible?: boolean;
  featured?: boolean;
  thumbnail_url?: string;
  duration_seconds?: number;
  sort_order?: number;
};

/** Admin: list every recorded lesson with its curation meta. */
export async function listAdminLibrary(params: {
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<Envelope<LibraryItem[]>> {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.page) p.set("page", String(params.page));
  if (params.page_size) p.set("page_size", String(params.page_size));
  const s = p.toString();
  return apiFetch<LibraryItem[]>(`/admin/library${s ? `?${s}` : ""}`);
}

/** Admin: curate a lesson's library row. */
export async function updateLibraryMeta(lessonId: string, input: LibraryMetaInput): Promise<LibraryItem> {
  const res = await apiFetch<LibraryItem>(`/admin/library/${lessonId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}
