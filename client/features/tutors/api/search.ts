import { apiFetch, Envelope } from "@/lib/api";
import { qk } from "@/lib/queryClient";

export type Tutor = {
  id: string;
  slug: string;
  display_name: string;
  bio?: string;
  rating_avg: number;
  rating_count: number;
  ranking_score: number;
  subjects: { name: string; slug: string }[];
};

export type SearchParams = {
  subject?: string;
  location?: string;
  online?: boolean;
  in_person?: boolean;
  min_price?: number;
  max_price?: number;
  page?: number;
  page_size?: number;
  sort?: string;
};

export async function searchTutors(params: SearchParams): Promise<Envelope<Tutor[]>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return apiFetch<Tutor[]>(`/tutors/search?${qs.toString()}`);
}

export const tutorKeys = qk.tutors;
