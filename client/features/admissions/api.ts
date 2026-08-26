import { apiFetch, Envelope } from "@/lib/api";

export type AdmissionStatus =
  | "PENDING" | "REVIEWING" | "OFFERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type Application = {
  id: string;
  institution_id?: string | null;
  programme_id?: string | null;
  cohort_id?: string | null;
  parent_user_id: string;
  student_profile_id: string;
  applicant_name: string;
  current_level?: string | null;
  preferred_term?: string | null;
  notes?: string | null;
  status: AdmissionStatus;
  offer_fee?: number | null;
  offer_currency?: string | null;
  offer_message?: string | null;
  created_at: string;
};

export type AdmissionDocument = {
  id: string;
  application_id: string;
  name: string;
  url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
};

export type AcceptResult = {
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    currency: string;
  };
  application: Application;
};

export type ApplyInput = {
  student_profile_id: string;
  institution_id?: string;
  programme_id?: string;
  cohort_id?: string;
  applicant_name?: string;
  current_level?: string;
  preferred_term?: string;
  notes?: string;
};

/** Apply to enrol a learner (virtual-school admissions). */
export async function applyAdmission(input: ApplyInput): Promise<Application> {
  const res = await apiFetch<Application>("/admissions/apply", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** The family's admissions applications. */
export async function listMyAdmissions(): Promise<Application[]> {
  const res = await apiFetch<Application[]>("/admissions/me");
  return res.data ?? [];
}

// --- Parent actions ---

/** Accept an OFFERED application — auto-enrols the learner + wires a payable order. */
export async function acceptAdmission(id: string): Promise<AcceptResult> {
  const res = await apiFetch<AcceptResult>(`/me/admissions/${id}/accept`, { method: "POST" });
  return res.data;
}

export async function listMyDocuments(appId: string): Promise<AdmissionDocument[]> {
  const res = await apiFetch<AdmissionDocument[]>(`/me/admissions/${appId}/documents`);
  return res.data ?? [];
}

export async function addDocument(appId: string, input: { name: string; url: string; mime_type?: string; size_bytes?: number }): Promise<AdmissionDocument> {
  const res = await apiFetch<AdmissionDocument>(`/me/admissions/${appId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function removeDocument(appId: string, docId: string): Promise<void> {
  await apiFetch(`/me/admissions/${appId}/documents/${docId}`, { method: "DELETE" });
}

// --- Admin queue ---

export async function listAdminAdmissions(status?: string): Promise<Envelope<Application[]>> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<Application[]>(`/admin/admissions${qs}`);
}

export async function setAdmissionStatus(
  id: string,
  status: AdmissionStatus,
  offer?: { offer_fee?: number; offer_currency?: string; offer_message?: string }
): Promise<Application> {
  const res = await apiFetch<Application>(`/admin/admissions/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status, ...offer }),
  });
  return res.data;
}

export async function listAdminDocuments(appId: string): Promise<AdmissionDocument[]> {
  const res = await apiFetch<AdmissionDocument[]>(`/admin/admissions/${appId}/documents`);
  return res.data ?? [];
}
