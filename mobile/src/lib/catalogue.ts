import { apiFetch } from "./api";
import { formatNaira, formatRating, formatDate, formatDateTime, slugToTitle } from "./format";

// Re-export formatters for backward compatibility with existing screens.
export { formatNaira, formatRating, formatDate, formatDateTime, slugToTitle };
import AsyncStorage from "@react-native-async-storage/async-storage";

// Public catalogue types + fetchers for the mobile app — subjects and tutors.
// Shapes mirror the web DTOs (TutorDTO, academics.Subject) so search, subject
// and tutor-detail screens read the same data as the website.
//
// Offline-first: successful reads are cached to AsyncStorage (keyed by path)
// and served as a stale fallback when the network fails, so the public
// catalogue stays usable on poor/unavailable connections.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cat:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed._ts === "number" && Date.now() - parsed._ts > CACHE_TTL_MS) return null;
    return parsed._data as T;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`cat:${key}`, JSON.stringify({ _ts: Date.now(), _data: data }));
  } catch {
    // caching is best-effort
  }
}

// Fetch + cache a GET path: try network, fall back to stale cache.
async function fetchCached<T>(path: string): Promise<T | null> {
  try {
    const res = await apiFetch<T>(path, {}, { retries: 1 });
    cacheSet(path, res.data).catch(() => {});
    return res.data ?? null;
  } catch {
    return cacheGet<T>(path);
  }
}

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

export async function listSubjects(params?: { search?: string; category?: string }): Promise<CatalogueSubject[]> {
  return (await fetchCached<CatalogueSubject[]>(`/subjects${qs({ search: params?.search, category: params?.category, page_size: 100 })}`)) ?? [];
}

export async function getSubject(slug: string): Promise<CatalogueSubject | null> {
  return fetchCached<CatalogueSubject>(`/subjects/${slug}`);
}

export async function searchTutors(params: { q?: string; subject?: string; page_size?: number }): Promise<TutorCard[]> {
  return (await fetchCached<TutorCard[]>(`/tutors/search${qs({ q: params.q, subject: params.subject, page_size: params.page_size ?? 30 })}`)) ?? [];
}

export async function getTutor(slug: string): Promise<TutorCard | null> {
  return fetchCached<TutorCard>(`/tutors/${slug}`);
}

export type TutorReview = {
  id: string;
  reviewer_user_id: string;
  tutor_profile_id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: string;
  is_public: boolean;
  consent_given: boolean;
  created_at: string;
};

export type ProgrammeDetail = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  format: string;
  status: string;
  price_min?: number | null;
  price_max?: number | null;
  currency: string;
  is_featured: boolean;
  curriculum_name?: string | null;
  level_name?: string | null;
  exam_name?: string | null;
  next_start?: string | null;
  subjects: string[];
  subject_slugs: string[];
};

export type CohortDetail = {
  id: string;
  programme_id: string;
  title: string;
  slug: string;
  tutor_profile_id?: string | null;
  capacity: number;
  enrolled_count: number;
  start_date: string;
  end_date: string;
  schedule_description?: string | null;
  timezone: string;
  location_mode: string;
  fee: number;
  currency: string;
  status: string;
  published_at?: string | null;
};

export async function getTutorReviews(slug: string): Promise<TutorReview[]> {
  return (await fetchCached<TutorReview[]>(`/tutors/${slug}/reviews`)) ?? [];
}

export async function getProgramme(slug: string): Promise<ProgrammeDetail | null> {
  return fetchCached<ProgrammeDetail>(`/programmes/${slug}`);
}

export async function getCohort(id: string): Promise<CohortDetail | null> {
  return fetchCached<CohortDetail>(`/cohorts/${id}`);
}
