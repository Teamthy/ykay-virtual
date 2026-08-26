package tutor

import (
	"time"

	"github.com/google/uuid"
)

type TutorStatus string

const (
	TutorStatusDraft        TutorStatus = "DRAFT"
	TutorStatusSubmitted    TutorStatus = "SUBMITTED"
	TutorStatusUnderReview  TutorStatus = "UNDER_REVIEW"
	TutorStatusInterview    TutorStatus = "INTERVIEW"
	TutorStatusVerification TutorStatus = "VERIFICATION"
	TutorStatusApproved     TutorStatus = "APPROVED"
	TutorStatusRejected     TutorStatus = "REJECTED"
	TutorStatusSuspended    TutorStatus = "SUSPENDED"
	TutorStatusHold         TutorStatus = "HOLD"
)

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

type DocumentType string

const (
	DocGovtID      DocumentType = "GOVT_ID"
	DocCertificate DocumentType = "CERTIFICATE"
	DocCV          DocumentType = "CV"
	DocReference   DocumentType = "REFERENCE_LETTER"
	DocGuarantorID DocumentType = "GUARANTOR_ID"
	DocOther       DocumentType = "OTHER"
)

type DocumentStatus string

const (
	DocPending  DocumentStatus = "PENDING"
	DocApproved DocumentStatus = "APPROVED"
	DocRejected DocumentStatus = "REJECTED"
)

type TutorProfile struct {
	ID               uuid.UUID   `json:"id"`
	UserID           uuid.UUID   `json:"user_id"`
	Slug             string      `json:"slug"`
	DisplayName      string      `json:"display_name"`
	Bio              *string     `json:"bio,omitempty"`
	Headline         *string     `json:"headline,omitempty"`
	YearsExperience  int         `json:"years_experience"`
	HourlyRateMin    *float64    `json:"hourly_rate_min,omitempty"`
	HourlyRateMax    *float64    `json:"hourly_rate_max,omitempty"`
	Currency         string      `json:"currency"`
	Status           TutorStatus `json:"status"`
	IsPublic         bool        `json:"is_public"`
	VerifiedAt       *time.Time  `json:"verified_at,omitempty"`
	ApprovedAt       *time.Time  `json:"approved_at,omitempty"`
	ApprovedBy       *uuid.UUID  `json:"approved_by,omitempty"`
	RatingAvg        float64     `json:"rating_avg"`
	RatingCount      int         `json:"rating_count"`
	TotalHoursTaught int         `json:"total_hours_taught"`
	TotalStudents    int         `json:"total_students"`
	RankingScore     float64     `json:"ranking_score"`
	Timezone         string      `json:"timezone"`
	LocationID       *uuid.UUID  `json:"location_id,omitempty"`
	AcceptsOnline    bool        `json:"accepts_online"`
	AcceptsInPerson  bool        `json:"accepts_in_person"`
	// Bank details — the tutor's payout destination (000055). Owner/admin
	// surfaces only; public search results never carry these.
	BankName      *string `json:"bank_name,omitempty"`
	BankCode      *string `json:"bank_code,omitempty"` // Paystack bank code (000056)
	AccountNumber *string `json:"account_number,omitempty"`
	AccountName   *string `json:"account_name,omitempty"`
	// PaystackRecipientCode — cached transfer-recipient code (000056). Not
	// serialized: it is an internal Paystack identifier, surfaced only via
	// the admin payout queue row.
	PaystackRecipientCode *string   `json:"-"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type Qualification struct {
	ID             uuid.UUID `json:"id"`
	TutorProfileID uuid.UUID `json:"tutor_profile_id"`
	Title          string    `json:"title"`
	Institution    *string   `json:"institution,omitempty"`
	Year           *int      `json:"year,omitempty"`
	Description    *string   `json:"description,omitempty"`
	IsVerified     bool      `json:"is_verified"`
	CreatedAt      time.Time `json:"created_at"`
}

type Document struct {
	ID              uuid.UUID      `json:"id"`
	TutorProfileID  uuid.UUID      `json:"tutor_profile_id"`
	Type            DocumentType   `json:"type"`
	FileKey         string         `json:"-"` // PRIVATE bucket, never expose raw
	FileName        string         `json:"file_name"`
	FileSize        *int           `json:"file_size,omitempty"`
	MimeType        *string        `json:"mime_type,omitempty"`
	Status          DocumentStatus `json:"status"`
	ReviewedBy      *uuid.UUID     `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time     `json:"reviewed_at,omitempty"`
	RejectionReason *string        `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
}

type Availability struct {
	ID             uuid.UUID  `json:"id"`
	TutorProfileID uuid.UUID  `json:"tutor_profile_id"`
	DayOfWeek      int        `json:"day_of_week"` // 0-6 Sunday=0
	StartTime      string     `json:"start_time"`  // "09:00"
	EndTime        string     `json:"end_time"`
	IsRecurring    bool       `json:"is_recurring"`
	ValidFrom      *time.Time `json:"valid_from,omitempty"`
	ValidTo        *time.Time `json:"valid_to,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type AvailabilityException struct {
	ID             uuid.UUID `json:"id"`
	TutorProfileID uuid.UUID `json:"tutor_profile_id"`
	ExceptionDate  time.Time `json:"exception_date"`
	IsAvailable    bool      `json:"is_available"`
	StartTime      *string   `json:"start_time,omitempty"`
	EndTime        *string   `json:"end_time,omitempty"`
	Reason         *string   `json:"reason,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type VettingEvent struct {
	ID             uuid.UUID    `json:"id"`
	TutorProfileID uuid.UUID    `json:"tutor_profile_id"`
	Stage          VettingStage `json:"stage"`
	FromStatus     *TutorStatus `json:"from_status,omitempty"`
	ToStatus       TutorStatus  `json:"to_status"`
	ActorUserID    *uuid.UUID   `json:"actor_user_id,omitempty"`
	Notes          *string      `json:"notes,omitempty"`
	Metadata       *string      `json:"metadata,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
}

type CompetencyAssessment struct {
	ID             uuid.UUID  `json:"id"`
	TutorProfileID uuid.UUID  `json:"tutor_profile_id"`
	SubjectID      *uuid.UUID `json:"subject_id,omitempty"`
	Score          *float64   `json:"score,omitempty"`
	MaxScore       float64    `json:"max_score"`
	Passed         bool       `json:"passed"`
	AttemptedAt    time.Time  `json:"attempted_at"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
}

// Business rules
func (t *TutorProfile) IsApproved() bool {
	return t.Status == TutorStatusApproved
}

func (t *TutorProfile) CanTeach() bool {
	return t.Status == TutorStatusApproved && t.IsPublic
}

func (t *TutorProfile) CanTransitionTo(newStatus TutorStatus) bool {
	transitions := map[TutorStatus][]TutorStatus{
		TutorStatusDraft:        {TutorStatusSubmitted},
		TutorStatusSubmitted:    {TutorStatusUnderReview, TutorStatusHold},
		TutorStatusUnderReview:  {TutorStatusInterview, TutorStatusHold, TutorStatusRejected},
		TutorStatusInterview:    {TutorStatusVerification, TutorStatusHold, TutorStatusRejected},
		TutorStatusVerification: {TutorStatusApproved, TutorStatusRejected, TutorStatusHold},
		TutorStatusHold:         {TutorStatusUnderReview, TutorStatusRejected},
		TutorStatusApproved:     {TutorStatusSuspended},
		TutorStatusSuspended:    {TutorStatusApproved, TutorStatusRejected},
	}
	allowed, ok := transitions[t.Status]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == newStatus {
			return true
		}
	}
	return false
}
