import { apiFetch } from "@/lib/api";

export type Review = {
  id: string;
  reviewer_user_id: string;
  tutor_profile_id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  is_public: boolean;
  consent_given: boolean;
  created_at: string;
};

/** Public, consent-gated published reviews for a tutor. */
export async function listTutorReviews(tutorSlug: string): Promise<Review[]> {
  const res = await apiFetch<Review[]>(`/tutors/${tutorSlug}/reviews`);
  return res.data ?? [];
}

export type CreateReviewInput = {
  tutor_profile_id: string;
  booking_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  consent_given: boolean;
};

/** Parent submits a review (starts PENDING; published after moderation). */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const res = await apiFetch<Review>("/reviews", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}
