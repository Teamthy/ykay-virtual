import { apiFetch } from "@/lib/api";
import type { BookingResponse, InitiatePaymentResponse, PaymentProvider } from "../types";

export type CreateCohortBookingParams = {
  cohort_id: string;
  student_id: string;
  idempotency_key: string;
};

/**
 * Creates a cohort booking (transactional order + PENDING enrollment).
 * Idempotency key replays return the original order — safe to retry.
 */
export async function createCohortBooking(params: CreateCohortBookingParams): Promise<BookingResponse> {
  const res = await apiFetch<BookingResponse>("/bookings", {
    method: "POST",
    // G1: the paying parent is derived from the session server-side.
    body: JSON.stringify({
      type: "COHORT",
      cohort_id: params.cohort_id,
      student_id: params.student_id,
      idempotency_key: params.idempotency_key,
    }),
  });
  return res.data;
}

export type CreatePrivateBookingParams = {
  student_id: string;
  tutor_profile_id: string;
  subject_id: string;
  total_sessions: number;
  session_duration_minutes: number;
  currency?: string;
  goals?: string;
  idempotency_key: string;
};

/** Creates a private tuition package + order. Payer is the session user. */
export async function createPrivateBooking(params: CreatePrivateBookingParams): Promise<BookingResponse> {
  const res = await apiFetch<BookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify({ type: "PRIVATE", ...params }),
  });
  return res.data;
}

export type InitiatePaymentParams = {
  order_id: string;
  provider: PaymentProvider;
  email: string;
};

/**
 * Initiates payment for a PENDING order. Returns the hosted checkout link;
 * the client redirect is never trusted — confirmation arrives only via the
 * signature-verified webhook.
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResponse> {
  const res = await apiFetch<InitiatePaymentResponse>("/payments/initiate", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.data;
}
