import { apiFetch } from "./api";

// Tutor-side mobile types + fetchers — mirror the backend DTOs exactly so the
// app and the web tutor dashboard read the same data (no drift). Endpoints:
// GET /me/earnings, GET /me/tutor-lessons, GET|POST /me/availability,
// GET /me/conversations + messages, GET /cohorts/{id}.

export type EscrowHold = {
  id: string;
  order_id: string;
  tutor_profile_id: string;
  amount: number;
  status: string;
  held_at: string;
  release_at?: string | null;
  released_at?: string | null;
  dispute_reason?: string | null;
};

export type Payout = {
  id: string;
  tutor_profile_id: string;
  escrow_hold_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at?: string | null;
};

export type TutorEarnings = {
  escrow_holds: EscrowHold[];
  payouts: Payout[];
  held_total: number;
  released_total: number;
  paid_total: number;
};

export type TutorLesson = {
  id: string;
  cohort_id?: string | null;
  private_package_id?: string | null;
  tutor_profile_id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string | null;
  meeting_provider: string;
  video_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilitySlot = {
  id: string;
  tutor_profile_id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string; // "09:00"
  end_time: string;
  is_recurring: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at: string;
};

export type ConversationItem = {
  id: string;
  type: string;
  booking_id?: string | null;
  cohort_id?: string | null;
  subject?: string | null;
  is_closed: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  other_user_id?: string | null;
  other_user_name?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

export type TutorMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  type: string;
  body: string;
  metadata?: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
};

export type CohortSummary = { id: string; title: string };

export function getTutorEarnings(): Promise<TutorEarnings> {
  return apiFetch<TutorEarnings>("/me/earnings").then((r) => r.data);
}

export function getTutorLessons(): Promise<TutorLesson[]> {
  return apiFetch<TutorLesson[]>("/me/tutor-lessons").then((r) => r.data ?? []);
}

// FR-23 self-service: move or cancel a lesson (tutor-of-lesson or admin).
export function rescheduleTutorLesson(lessonId: string, startAt: string, endAt: string): Promise<void> {
  return apiFetch(`/lessons/${lessonId}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ start_at: startAt, end_at: endAt }),
  }).then(() => undefined);
}

export function cancelTutorLesson(lessonId: string): Promise<void> {
  return apiFetch(`/lessons/${lessonId}/cancel`, {
    method: "POST",
  }).then(() => undefined);
}

export function getAvailability(): Promise<AvailabilitySlot[]> {
  return apiFetch<AvailabilitySlot[]>("/me/availability").then((r) => r.data ?? []);
}

export function addAvailability(input: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
}): Promise<AvailabilitySlot> {
  return apiFetch<AvailabilitySlot>("/me/availability", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.data);
}

export function deleteAvailability(id: string): Promise<void> {
  return apiFetch<unknown>(`/me/availability/${id}`, { method: "DELETE" }).then(() => undefined);
}

export function getConversations(): Promise<ConversationItem[]> {
  return apiFetch<ConversationItem[]>("/me/conversations").then((r) => r.data ?? []);
}

export function getMessages(conversationId: string): Promise<TutorMessage[]> {
  return apiFetch<TutorMessage[]>(`/me/conversations/${conversationId}/messages`).then((r) => r.data ?? []);
}

export function sendMessage(conversationId: string, body: string): Promise<TutorMessage> {
  return apiFetch<TutorMessage>(`/me/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }).then((r) => r.data);
}

export function getCohort(id: string): Promise<CohortSummary | null> {
  return apiFetch<CohortSummary>(`/cohorts/${id}`)
    .then((r) => r.data)
    .catch(() => null);
}

// --- display helpers -------------------------------------------------------

export function formatNaira(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export function formatLessonTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type TutorProfile = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  bio?: string | null;
  headline?: string | null;
  years_experience: number;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  currency: string;
  status: string;
  is_public: boolean;
  verified_at?: string | null;
  approved_at?: string | null;
  rating_avg: number;
  rating_count: number;
  total_hours_taught: number;
  total_students: number;
  timezone: string;
  accepts_online: boolean;
  accepts_in_person: boolean;
  subjects?: { name: string }[] | null;
};

export function getTutorProfile(): Promise<TutorProfile> {
  return apiFetch<TutorProfile>("/tutors/me/vetting/profile").then((r) => r.data);
}
