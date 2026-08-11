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

// Dev-auth bridge headers until Phase 7 sessions: X-User-ID + X-User-Roles.
// The API's service layer enforces owner/admin authorization regardless.
function actorHeaders(userId: string, roles: string[] = ["STUDENT"]) {
  return { "X-User-ID": userId, "X-User-Roles": roles.join(",") };
}

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

export async function createTutorProfile(userId: string, input: CreateProfileInput): Promise<TutorProfile> {
  const res = await apiFetch<TutorProfile>("/tutors/me/vetting/profile", {
    method: "POST",
    headers: actorHeaders(userId, ["TUTOR"]),
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getMyProfile(userId: string): Promise<TutorProfile | null> {
  try {
    const res = await apiFetch<TutorProfile>("/tutors/me/vetting/profile", {
      headers: actorHeaders(userId, ["TUTOR"]),
    });
    return res.data;
  } catch {
    return null; // no profile yet
  }
}

export async function addSubject(userId: string, profileId: string, subjectId: string): Promise<void> {
  await apiFetch(`/tutors/me/vetting/profiles/${profileId}/subjects`, {
    method: "POST",
    headers: actorHeaders(userId, ["TUTOR"]),
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export async function listMySubjects(userId: string, profileId: string): Promise<TutorSubjectEntry[]> {
  const res = await apiFetch<TutorSubjectEntry[]>(
    `/tutors/me/vetting/profiles/${profileId}/subjects`,
    { headers: actorHeaders(userId, ["TUTOR"]) }
  );
  return res.data;
}

export async function submitForReview(userId: string, profileId: string): Promise<void> {
  await apiFetch(`/tutors/me/vetting/profiles/${profileId}/submit`, {
    method: "POST",
    headers: actorHeaders(userId, ["TUTOR"]),
  });
}

export type DocumentUploadResult = {
  document: VettingDocument;
  upload_url: string;
};

export async function requestDocumentUpload(
  userId: string,
  profileId: string,
  type: DocumentType,
  fileName: string,
  mimeType: string
): Promise<DocumentUploadResult> {
  const res = await apiFetch<DocumentUploadResult>(`/tutors/me/vetting/profiles/${profileId}/documents`, {
    method: "POST",
    headers: actorHeaders(userId, ["TUTOR"]),
    body: JSON.stringify({ type, file_name: fileName, mime_type: mimeType }),
  });
  return res.data;
}

export async function startAssessment(
  userId: string,
  profileId: string,
  subjectId: string
): Promise<AttemptWithQuestions> {
  const res = await apiFetch<AttemptWithQuestions>(
    `/tutors/me/vetting/profiles/${profileId}/assessments`,
    {
      method: "POST",
      headers: actorHeaders(userId, ["TUTOR"]),
      body: JSON.stringify({ subject_id: subjectId }),
    }
  );
  return res.data;
}

export type AnswerInput = { question_id: string; chosen_index: number };

export async function submitAssessment(
  userId: string,
  attemptId: string,
  answers: AnswerInput[]
): Promise<AssessmentResult> {
  const res = await apiFetch<AssessmentResult>(`/tutors/me/vetting/assessments/${attemptId}/submit`, {
    method: "POST",
    headers: actorHeaders(userId, ["TUTOR"]),
    body: JSON.stringify({ answers }),
  });
  return res.data;
}

// --- Admin ---

export async function listVettingQueue(
  adminId: string,
  status: string,
  page = 1
): Promise<Envelope<TutorProfile[]>> {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  qs.set("page", String(page));
  return apiFetch<TutorProfile[]>(`/admin/vetting/queue?${qs}`, {
    headers: actorHeaders(adminId, ["ADMIN"]),
  });
}

export async function getVettingProfile(adminId: string, profileId: string): Promise<ProfileDetail> {
  const res = await apiFetch<ProfileDetail>(`/admin/vetting/profiles/${profileId}`, {
    headers: actorHeaders(adminId, ["ADMIN"]),
  });
  return res.data;
}

export type AdminAction = "review" | "interview" | "verify" | "approve" | "reject" | "hold" | "suspend";

export async function adminAction(adminId: string, profileId: string, action: AdminAction, reason = ""): Promise<void> {
  await apiFetch(`/admin/vetting/profiles/${profileId}/${action}`, {
    method: "POST",
    headers: actorHeaders(adminId, ["ADMIN"]),
    body: JSON.stringify({ reason }),
  });
}

export async function reviewDocument(
  adminId: string,
  documentId: string,
  approve: boolean,
  reason = ""
): Promise<void> {
  await apiFetch(`/admin/vetting/documents/${documentId}/review`, {
    method: "POST",
    headers: actorHeaders(adminId, ["ADMIN"]),
    body: JSON.stringify({ approve, reason }),
  });
}
