package review

import (
	"time"
	"github.com/google/uuid"
)

type ReviewStatus string
const (
	ReviewPending   ReviewStatus = "PENDING"
	ReviewPublished ReviewStatus = "PUBLISHED"
	ReviewHidden    ReviewStatus = "HIDDEN"
	ReviewFlagged   ReviewStatus = "FLAGGED"
)

type Review struct {
	ID                 uuid.UUID    `json:"id"`
	BookingID          *uuid.UUID   `json:"booking_id,omitempty"`
	CohortEnrollmentID *uuid.UUID   `json:"cohort_enrollment_id,omitempty"`
	ReviewerUserID     uuid.UUID    `json:"reviewer_user_id"`
	TutorProfileID     uuid.UUID    `json:"tutor_profile_id"`
	Rating             int          `json:"rating"`
	Title              *string      `json:"title,omitempty"`
	Comment            *string      `json:"comment,omitempty"`
	Status             ReviewStatus `json:"status"`
	IsPublic           bool         `json:"is_public"`
	ConsentGiven       bool         `json:"consent_given"`
	ModeratedBy        *uuid.UUID   `json:"moderated_by,omitempty"`
	ModeratedAt        *time.Time   `json:"moderated_at,omitempty"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
}

type ReviewResponse struct {
	ID              uuid.UUID `json:"id"`
	ReviewID        uuid.UUID `json:"review_id"`
	ResponderUserID uuid.UUID `json:"responder_user_id"`
	Body            string    `json:"body"`
	CreatedAt       time.Time `json:"created_at"`
}
