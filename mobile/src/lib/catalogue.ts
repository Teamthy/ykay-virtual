import { apiFetch } from "./api";

// Public catalogue types + fetchers for the mobile app — subjects and tutors.
// Shapes mirror the web DTOs (TutorDTO, academics.Subject) so search, subject
// and tutor-detail screens read the same data as the website.

export type CatalogueSubject = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TutorSubject = { name: string; slug: string };

export type TutorCard = {
  id: string;
  slug: string;
  display_name: string;
  headline?: string | null;
  bio?: string | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  currency: string;
  rating_avg: number;
  rating_count: number;
  ranking_score: number;
  location?: string | null;
  accepts_online: boolean;
  subjects: TutorSubject[];
  timezone: string;
  years_experience: number;
  total_hours_taught: number;
  total_students: number;
  verified_at?: string | null;
};

function qs(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export function listSubjects(params?: { search?: string; category?: string }): Promise<CatalogueSubject[]> {
  return apiFetch<CatalogueSubject[]>(`/subjects${qs({ search: params?.search, category: params?.category, page_size: 100 })}`).then(
    (r) => r.data ?? []
  );
}

export function getSubject(slug: string): Promise<CatalogueSubject | null> {
  return apiFetch<CatalogueSubject>(`/subjects/${slug}`)
    .then((r) => r.data)
    .catch(() => null);
}

export function searchTutors(params: { q?: string; subject?: string; page_size?: number }): Promise<TutorCard[]> {
  return apiFetch<TutorCard[]>(`/tutors/search${qs({ q: params.q, subject: params.subject, page_size: params.page_size ?? 30 })}`).then(
    (r) => r.data ?? []
  );
}

export function getTutor(slug: string): Promise<TutorCard | null> {
  return apiFetch<TutorCard>(`/tutors/${slug}`)
    .then((r) => r.data)
    .catch(() => null);
}

export function formatNaira(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatRating(avg: number, count: number): string {
  if (count === 0) return "No reviews yet";
  return `${avg.toFixed(1)}★ · ${count} review${count === 1 ? "" : "s"}`;
}
