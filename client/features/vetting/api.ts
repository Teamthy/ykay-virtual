import { apiFetch, Envelope } from "@/lib/api";
import type {
  AssessmentResult,
  AttemptWithQuestions,
  DocumentType,
  ProfileDetail,
  TutorProfile,
  TutorSubjectEntry,
  VettingDocument,
} from "./types";

export type { TutorProfile, TutorSubjectEntry, ProfileDetail };

// G1 (phase 43): the dev-auth header bridge is gone - the API resolves the
// actor exclusively from the httpOnly session cookie. No caller-supplied
// user IDs; object-level authorization is enforced server-side.

export type CreateProfileInput = {
  display_name: string;
  headline?: string;
  bio?: string;
  years_experience: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  currency?: string;
  timezone?: string;
  accepts_online?: boolean;
  accepts_in_person?: boolean;
};

export async function createTutorProfile(input: CreateProfileInput): Promise<TutorProfile> {
  const res = await apiFetch<TutorProfile>("/tutors/me/vetting/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getMyProfile(): Promise<TutorProfile | null> {
  try {
    const res = await apiFetch<TutorProfile>("/tutors/me/vetting/profile");
    return res.data;
  } catch {
    return null; // no profile yet
  }
}

export async function addSubject(profileId: string, subjectId: string): Promise<void> {
  await apiFetch(`/tutors/me/vetting/profiles/${profileId}/subjects`, {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export async function listMySubjects(profileId: string): Promise<TutorSubjectEntry[]> {
  const res = await apiFetch<TutorSubjectEntry[]>(
    `/tutors/me/vetting/profiles/${profileId}/subjects`
  );
  return res.data;
}

export async function submitForReview(profileId: string): Promise<void> {
  await apiFetch(`/tutors/me/vetting/profiles/${profileId}/submit`, {
    method: "POST",
  });
}

export type DocumentUploadResult = {
  document: VettingDocument;
  upload_url: string;
};

export async function requestDocumentUpload(
  profileId: string,
  type: DocumentType,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<DocumentUploadResult> {
  const res = await apiFetch<DocumentUploadResult>(`/tutors/me/vetting/profiles/${profileId}/documents`, {
    method: "POST",
    body: JSON.stringify({ type, file_name: fileName, mime_type: mimeType, file_size: fileSize }),
  });
  return res.data;
}

export async function startAssessment(
  profileId: string,
  subjectId: string
): Promise<AttemptWithQuestions> {
  const res = await apiFetch<AttemptWithQuestions>(
    `/tutors/me/vetting/profiles/${profileId}/assessments`,
    {
      method: "POST",
      body: JSON.stringify({ subject_id: subjectId }),
    }
  );
  return res.data;
}

export type AnswerInput = { question_id: string; chosen_index: number };

export async function submitAssessment(
  attemptId: string,
  answers: AnswerInput[]
): Promise<AssessmentResult> {
  const res = await apiFetch<AssessmentResult>(`/tutors/me/vetting/assessments/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  return res.data;
}

// --- Admin (session must carry an admin role) ---

export async function listVettingQueue(status: string, page = 1): Promise<Envelope<TutorProfile[]>> {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  qs.set("page", String(page));
  return apiFetch<TutorProfile[]>(`/admin/vetting/queue?${qs}`);
}

export async function getVettingProfile(profileId: string): Promise<ProfileDetail> {
  const res = await apiFetch<ProfileDetail>(`/admin/vetting/profiles/${profileId}`);
  return res.data;
}

export type AdminAction = "review" | "interview" | "verify" | "approve" | "reject" | "hold" | "suspend";

export async function adminAction(profileId: string, action: AdminAction, reason = ""): Promise<void> {
  await apiFetch(`/admin/vetting/profiles/${profileId}/${action}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function reviewDocument(
  documentId: string,
  approve: boolean,
  reason = ""
): Promise<void> {
  await apiFetch(`/admin/vetting/documents/${documentId}/review`, {
    method: "POST",
    body: JSON.stringify({ approve, reason }),
  });
}

export async function updateBankDetails(
  profileId: string,
  input: { bank_name: string; bank_code?: string; account_number: string; account_name: string }
): Promise<void> {
  await apiFetch(`/tutors/me/vetting/profiles/${profileId}/bank`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
