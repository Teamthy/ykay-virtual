import { apiFetch, Envelope } from "@/lib/api";

export type PrivateTuitionRequest = {
  id: string;
  parent_user_id: string;
  student_profile_id: string;
  subject_id: string;
  goals?: string;
  preferred_days?: string;
  preferred_time_range?: string;
  timezone: string;
  location_mode: string;
  status: string;
  matched_tutor_id?: string | null;
  created_at: string;
};

export type CreatePrivateRequestParams = {
  student_id: string;
  subject_id: string;
  goals?: string;
  preferred_days?: string;
  preferred_time?: string;
  timezone?: string;
  location_mode?: string;
};

/** Request to be matched to a private tutor (managed matching). */
export async function createPrivateTuitionRequest(params: CreatePrivateRequestParams): Promise<PrivateTuitionRequest> {
  const res = await apiFetch<PrivateTuitionRequest>("/private-tuition/requests", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.data;
}

/** A parent's own tuition requests. */
export async function listMyPrivateRequests(): Promise<PrivateTuitionRequest[]> {
  const res = await apiFetch<PrivateTuitionRequest[]>("/private-tuition/requests");
  return res.data ?? [];
}

// --- Admin matching queue ---

export async function listAdminPrivateRequests(status?: string): Promise<Envelope<PrivateTuitionRequest[]>> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<PrivateTuitionRequest[]>(`/admin/private-tuition/requests${qs}`);
}

export type MatchRequestInput = {
  tutor_profile_id: string;
  total_sessions: number;
  session_duration_minutes: number;
};

export type MatchRequestResult = {
  request: PrivateTuitionRequest;
  package: {
    id: string;
    total_sessions: number;
    price_per_session: number;
    total_price: number;
    currency: string;
    status: string;
  };
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    currency: string;
    status: string;
  };
};

/** Admin matches a vetted tutor → creates the payable package + escrow order. */
export async function matchPrivateRequest(requestId: string, input: MatchRequestInput): Promise<MatchRequestResult> {
  const res = await apiFetch<MatchRequestResult>(`/admin/private-tuition/requests/${requestId}/match`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}
