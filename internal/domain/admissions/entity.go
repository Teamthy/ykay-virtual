// Package admissions — virtual-school admissions applications. A parent/guardian
// applies to enrol a learner into a school (or a specific programme/cohort);
// admins review and offer/accept.
package admissions

import (
	"time"

	"github.com/google/uuid"
)

// Status — lifecycle of an admissions application.
type Status string

const (
	StatusPending   Status = "PENDING"
	StatusReviewing Status = "REVIEWING"
	StatusOffered   Status = "OFFERED"
	StatusAccepted  Status = "ACCEPTED"
	StatusRejected  Status = "REJECTED"
	StatusWithdrawn Status = "WITHDRAWN"
)

// Application — one admissions request.
type Application struct {
	ID               uuid.UUID  `json:"id"`
	InstitutionID    *uuid.UUID `json:"institution_id,omitempty"`
	ProgrammeID      *uuid.UUID `json:"programme_id,omitempty"`
	CohortID         *uuid.UUID `json:"cohort_id,omitempty"`
	ParentUserID     uuid.UUID  `json:"parent_user_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	ApplicantName    string     `json:"applicant_name"`
	CurrentLevel     *string    `json:"current_level,omitempty"`
	PreferredTerm    *string    `json:"preferred_term,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
	Status           Status     `json:"status"`
	ReviewedBy       *uuid.UUID `json:"reviewed_by,omitempty"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}
