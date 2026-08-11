package vetting

import (
	"time"

	"github.com/google/uuid"
)

// Domain types for the staged tutor vetting pipeline + competency assessment
// engine (migrations 000004, 000012). Pure business rules — no framework
// imports (AGENTS.md).

// VettingStage mirrors migration vetting_stage_type.
type VettingStage string

const (
	StageAccount       VettingStage = "ACCOUNT"
	StagePersonal      VettingStage = "PERSONAL_PROFILE"
	StageProfessional  VettingStage = "PROFESSIONAL"
	StageTeachingScope VettingStage = "TEACHING_SCOPE"
	StageEvidence      VettingStage = "EVIDENCE"
	StageScreening     VettingStage = "SCREENING"
	StageDecision      VettingStage = "DECISION"
	StageActivation    VettingStage = "ACTIVATION"
)

// DocumentType mirrors migration document_type.
type DocumentType string

const (
	DocGovtID      DocumentType = "GOVT_ID"
	DocCertificate DocumentType = "CERTIFICATE"
	DocCV          DocumentType = "CV"
	DocReference   DocumentType = "REFERENCE_LETTER"
	DocGuarantorID DocumentType = "GUARANTOR_ID"
	DocOther       DocumentType = "OTHER"
)

// DocumentStatus mirrors migration document_status.
type DocumentStatus string

const (
	DocStatusPending  DocumentStatus = "PENDING"
	DocStatusApproved DocumentStatus = "APPROVED"
	DocStatusRejected DocumentStatus = "REJECTED"
)

// VettingDocument — tutor identity/qualification evidence stored in the
// PRIVATE bucket. FileKey is never serialized to clients (json:"-"),
// only signed URLs after server-side authz (AGENTS.md).
type VettingDocument struct {
	ID              uuid.UUID      `json:"id"`
	TutorProfileID  uuid.UUID      `json:"tutor_profile_id"`
	Type            DocumentType   `json:"type"`
	FileKey         string         `json:"-"`
	FileName        string         `json:"file_name"`
	FileSize        *int           `json:"file_size,omitempty"`
	MimeType        *string        `json:"mime_type,omitempty"`
	Status          DocumentStatus `json:"status"`
	ReviewedBy      *uuid.UUID     `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time     `json:"reviewed_at,omitempty"`
	RejectionReason *string        `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
}

// VettingEvent — attributable, timestamped state transition record.
type VettingEvent struct {
	ID             uuid.UUID    `json:"id"`
	TutorProfileID uuid.UUID    `json:"tutor_profile_id"`
	Stage          VettingStage `json:"stage"`
	FromStatus     *string      `json:"from_status,omitempty"`
	ToStatus       string       `json:"to_status"`
	ActorUserID    *uuid.UUID   `json:"actor_user_id,omitempty"`
	Notes          *string      `json:"notes,omitempty"`
	Metadata       *string      `json:"metadata,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
}

// --- Competency assessment engine ---

type QuestionDifficulty int

const (
	DiffEasy   QuestionDifficulty = 1
	DiffMedium QuestionDifficulty = 2
	DiffHard   QuestionDifficulty = 3
)

// AssessmentQuestion — question bank entry. Options is a JSON array of
// strings; CorrectIndex is never exposed to the candidate.
type AssessmentQuestion struct {
	ID           uuid.UUID          `json:"id"`
	SubjectID    uuid.UUID          `json:"subject_id"`
	Question     string             `json:"question"`
	Options      []string           `json:"options"`
	CorrectIndex int                `json:"-"`
	Explanation  *string            `json:"explanation,omitempty"`
	Difficulty   QuestionDifficulty `json:"difficulty"`
	IsActive     bool               `json:"is_active"`
}

// AssessmentAttemptStatus mirrors migration assessment_attempts.status.
type AssessmentAttemptStatus string

const (
	AttemptInProgress AssessmentAttemptStatus = "IN_PROGRESS"
	AttemptCompleted  AssessmentAttemptStatus = "COMPLETED"
)

// AssessmentAttempt — one sitting of the quiz for a tutor + subject.
type AssessmentAttempt struct {
	ID             uuid.UUID               `json:"id"`
	TutorProfileID uuid.UUID               `json:"tutor_profile_id"`
	SubjectID      uuid.UUID               `json:"subject_id"`
	Status         AssessmentAttemptStatus `json:"status"`
	Score          *float64                `json:"score,omitempty"`
	MaxScore       *float64                `json:"max_score,omitempty"`
	Passed         *bool                   `json:"passed,omitempty"`
	StartedAt      time.Time               `json:"started_at"`
	CompletedAt    *time.Time              `json:"completed_at,omitempty"`
	ExpiresAt      time.Time               `json:"expires_at"`
}

// PassThreshold — fraction of correct answers required to pass (70%).
const PassThreshold = 0.7

// AttemptDuration — how long a candidate has to complete an attempt.
const AttemptDuration = 30 * time.Minute

// QuestionsPerAttempt — number of questions sampled per attempt.
const QuestionsPerAttempt = 5

// CompetencyValidity — how long a passed assessment stays valid (12 months).
const CompetencyValidity = 12 * 30 * 24 * time.Hour

// IsExpired reports whether the attempt can no longer be submitted.
func (a *AssessmentAttempt) IsExpired(now time.Time) bool {
	return now.After(a.ExpiresAt)
}

// CanSubmit reports whether answers can still be submitted.
func (a *AssessmentAttempt) CanSubmit(now time.Time) bool {
	return a.Status == AttemptInProgress && !a.IsExpired(now)
}

// AssessmentAnswer — one answer within an attempt (UNIQUE attempt+question).
type AssessmentAnswer struct {
	ID          uuid.UUID `json:"id"`
	AttemptID   uuid.UUID `json:"attempt_id"`
	QuestionID  uuid.UUID `json:"question_id"`
	ChosenIndex *int      `json:"chosen_index,omitempty"`
	IsCorrect   bool      `json:"is_correct"`
}

// CompetencyAssessment — migration 000004 row; the durable pass record.
type CompetencyAssessment struct {
	ID             uuid.UUID  `json:"id"`
	TutorProfileID uuid.UUID  `json:"tutor_profile_id"`
	SubjectID      *uuid.UUID `json:"subject_id,omitempty"`
	Score          float64    `json:"score"`
	MaxScore       float64    `json:"max_score"`
	Passed         bool       `json:"passed"`
	AttemptedAt    time.Time  `json:"attempted_at"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
}
