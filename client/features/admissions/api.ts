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
  created_at: string;
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

// --- Admin queue ---

export async function listAdminAdmissions(status?: string): Promise<Envelope<Application[]>> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<Application[]>(`/admin/admissions${qs}`);
}

export async function setAdmissionStatus(id: string, status: AdmissionStatus): Promise<Application> {
  const res = await apiFetch<Application>(`/admin/admissions/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  return res.data;
}
