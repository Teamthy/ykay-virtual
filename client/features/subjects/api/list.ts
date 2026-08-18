import { apiFetch, Envelope } from "@/lib/api";

export type Subject = { id: string; name: string; slug: string; category: string; description?: string; photo?: string };

export async function listSubjects(params?: { search?: string; category?: string; page?: number; page_size?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  return apiFetch<Subject[]>(`/subjects?${qs.toString()}`);
}
