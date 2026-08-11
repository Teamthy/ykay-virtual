import { apiFetch } from "@/lib/api";

// Portal API — student/parent/tutor surfaces (Phase 11b).

// --- Tutor availability ---

export type Availability = {
  id: string;
  tutor_profile_id: string;
  day_of_week: number; // 0=Sunday
  start_time: string;
  end_time: string;
  is_recurring: boolean;
};

export type AvailabilityException = {
  id: string;
  tutor_profile_id: string;
  exception_date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
};

export async function listAvailability(tutorProfileId: string): Promise<Availability[]> {
  const res = await apiFetch<Availability[]>(`/me/availability?tutor_profile_id=${tutorProfileId}`);
  return res.data ?? [];
}

export async function upsertAvailability(input: {
  tutor_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
}): Promise<Availability> {
  const res = await apiFetch<Availability>("/me/availability", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}

export async function deleteAvailability(id: string, tutorProfileId: string): Promise<void> {
  await apiFetch(`/me/availability/${id}?tutor_profile_id=${tutorProfileId}`, { method: "DELETE" });
}

export async function listAvailabilityExceptions(tutorProfileId: string): Promise<AvailabilityException[]> {
  const res = await apiFetch<AvailabilityException[]>(`/me/availability-exceptions?tutor_profile_id=${tutorProfileId}`);
  return res.data ?? [];
}

export async function upsertAvailabilityException(input: {
  tutor_profile_id: string;
  exception_date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}): Promise<AvailabilityException> {
  const res = await apiFetch<AvailabilityException>("/me/availability-exceptions", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}

// --- Student ---

export type Assignment = {
  id: string;
  cohort_id?: string;
  lesson_id?: string;
  title: string;
  instructions?: string;
  due_at?: string;
  max_score?: number;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_profile_id: string;
  content?: string;
  score?: number;
  feedback?: string;
  submitted_at: string;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  untracked: number;
  rate: number;
};

export async function listMyAssignments(studentProfileId: string): Promise<Assignment[]> {
  const res = await apiFetch<Assignment[]>(`/me/assignments?student_profile_id=${studentProfileId}`);
  return res.data ?? [];
}

export async function submitAssignment(studentProfileId: string, assignmentId: string, content: string): Promise<Submission> {
  const res = await apiFetch<Submission>(`/me/assignments/${assignmentId}/submit?student_profile_id=${studentProfileId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function listMySubmissions(studentProfileId: string): Promise<Submission[]> {
  const res = await apiFetch<Submission[]>(`/me/submissions?student_profile_id=${studentProfileId}`);
  return res.data ?? [];
}

export async function getAttendanceSummary(studentProfileId: string): Promise<AttendanceSummary> {
  const res = await apiFetch<AttendanceSummary>(`/me/attendance-summary?student_profile_id=${studentProfileId}`);
  return res.data;
}

// --- Parent receipts ---

export type OrderReceipt = {
  order: {
    id: string;
    order_number: string;
    status: string;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    currency: string;
    created_at: string;
  };
  items: {
    item_type: string;
    reference_id: string;
    description?: string;
    quantity: number;
    total_price: number;
  }[];
  payments: {
    id: string;
    provider: string;
    provider_reference?: string;
    amount: number;
    status: string;
    paid_at?: string;
  }[];
};

export async function getOrderReceipt(orderId: string): Promise<OrderReceipt> {
  const res = await apiFetch<OrderReceipt>(`/me/orders/${orderId}`);
  return res.data;
}
