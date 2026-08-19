// Package certificate — learner completion certificates issued when a cohort
// is completed (virtual-school item). A certificate is a durable, tamper-evident
// credential: unique credential_number, learner + programme details, issuer,
// and the cohort it was earned from.
package certificate

import (
	"time"

	"github.com/google/uuid"
)

// Certificate — one issued completion credential.
type Certificate struct {
	ID               uuid.UUID  `json:"id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	CohortID         *uuid.UUID `json:"cohort_id,omitempty"`
	ProgrammeID      *uuid.UUID `json:"programme_id,omitempty"`
	LearnerName      string     `json:"learner_name"`
	Title            string     `json:"title"`
	ProgrammeTitle   *string    `json:"programme_title,omitempty"`
	CredentialNumber string     `json:"credential_number"`
	IssuedBy         string     `json:"issued_by"`
	IssuedAt         time.Time  `json:"issued_at"`
	CreatedAt        time.Time  `json:"created_at"`
}
