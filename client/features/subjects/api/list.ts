import { apiFetch, Envelope } from "@/lib/api";

export type Subject = { id: string; name: string; slug: string; category: string; description?: string };

export async function listSubjects(params?: { search?: string; category?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.page) qs.set("page", String(params.page));
  return apiFetch<Subject[]>(`/subjects?${qs.toString()}`);
}
