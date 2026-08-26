import { apiFetch } from "@/lib/api";

export type Certificate = {
  id: string;
  student_profile_id: string;
  cohort_id?: string | null;
  programme_id?: string | null;
  learner_name: string;
  title: string;
  programme_title?: string | null;
  credential_number: string;
  issued_by: string;
  issued_at: string;
};

/** The caller's completion certificates (own + linked learners). */
export async function listMyCertificates(): Promise<Certificate[]> {
  const res = await apiFetch<Certificate[]>("/me/certificates");
  return res.data ?? [];
}

export type VerifiedCertificate = {
  valid: boolean;
  learner_name: string;
  title: string;
  programme_title?: string | null;
  issued_by: string;
  issued_at: string;
  credential_number: string;
};

/** Public verification of a certificate by its credential number. */
export async function verifyCertificate(credential: string): Promise<VerifiedCertificate> {
  const res = await apiFetch<VerifiedCertificate>(`/certificates/verify?credential=${encodeURIComponent(credential)}`);
  return res.data;
}

export type VerifiedShare = {
  credential_number: string;
  learner_name: string;
  title: string;
  programme_title?: string | null;
  issued_by: string;
  issued_at: string;
  verify_url: string;
};

/** NUVORA Plus: generate a verified, shareable credential link. 402 if not subscribed. */
export async function verifiedShare(certId: string): Promise<VerifiedShare> {
  const res = await apiFetch<VerifiedShare>(`/me/certificates/${certId}/verified`, { method: "POST" });
  return res.data;
}
