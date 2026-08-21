// Vetting feature types - mirror api/openapi.yaml Phase 4 additions.

export type TutorStatus =
  | "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "INTERVIEW"
  | "VERIFICATION" | "APPROVED" | "REJECTED" | "SUSPENDED" | "HOLD";

export type TutorProfile = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  headline?: string;
  bio?: string;
  years_experience: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  currency: string;
  status: TutorStatus;
  is_public: boolean;
  ranking_score: number;
  timezone: string;
  accepts_online: boolean;
  accepts_in_person: boolean;
  verified_at?: string;
  approved_at?: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
};

export type TutorSubjectEntry = {
  subject_id: string;
  name: string;
  slug: string;
  approved: boolean;
};

export type DocumentType = "GOVT_ID" | "CERTIFICATE" | "CV" | "REFERENCE_LETTER" | "GUARANTOR_ID" | "OTHER";
export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VettingDocument = {
  id: string;
  tutor_profile_id: string;
  type: DocumentType;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  status: DocumentStatus;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
};

export type VettingEvent = {
  id: string;
  stage: string;
  from_status?: string;
  to_status: string;
  actor_user_id?: string;
  notes?: string;
  created_at: string;
};

export type AttemptQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type AssessmentAttempt = {
  id: string;
  tutor_profile_id: string;
  subject_id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  score?: number;
  max_score?: number;
  passed?: boolean;
  started_at: string;
  expires_at: string;
};

export type AttemptWithQuestions = {
  attempt: AssessmentAttempt;
  questions: AttemptQuestion[];
  pass_threshold: number;
};

export type AssessmentResult = {
  attempt_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  correct: number;
  total: number;
  competency_expires_at?: string;
};

export type CompetencyAssessment = {
  id: string;
  subject_id?: string;
  score: number;
  max_score: number;
  passed: boolean;
  attempted_at: string;
  expires_at?: string;
};

export type ProfileDetail = {
  profile: TutorProfile;
  documents: VettingDocument[];
  subjects: TutorSubjectEntry[];
  competency: CompetencyAssessment[];
  events: VettingEvent[];
};
