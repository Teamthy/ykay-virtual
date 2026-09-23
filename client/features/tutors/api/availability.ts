import { apiFetch } from "@/lib/api";
import { apiFetchSSR } from "@/lib/server-api";

export type TutorSlot = {
  id: string;
  tutor_profile_id: string;
  day_of_week: number; // 0-6, Sunday=0
  start_time: string; // "09:00"
  end_time: string;
  is_recurring: boolean;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(d: number): string {
  return DAYS[d] ?? "";
}

/** A tutor's real recurring availability (feature 4). Empty array = none set. */
export async function getTutorAvailability(tutorProfileId: string): Promise<TutorSlot[]> {
  const res = await apiFetch<TutorSlot[]>(`/tutors/${tutorProfileId}/availability`);
  return res.data ?? [];
}

/** SSR variant for the tutor profile page. */
export async function getTutorAvailabilitySSR(tutorProfileId: string): Promise<TutorSlot[]> {
  const res = await apiFetchSSR<TutorSlot[]>(`/tutors/${tutorProfileId}/availability`);
  return res.data ?? [];
}
