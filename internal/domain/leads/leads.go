// Package leads — conversion follow-up records (migration 000054_leads).
// Visitors who browse but don't enroll (callback requests, exit-intent
// captures, enrollment starts that never reach payment) become leads so the
// ops team can follow up on WhatsApp.
package leads

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Intent — why the lead exists.
const (
	IntentCallbackRequest    = "CALLBACK_REQUEST"    // visitor asked us to reach out
	IntentEnrollmentStarted  = "ENROLLMENT_STARTED"  // checkout began, payment not completed
	IntentGeneralInterest    = "GENERAL_INTEREST"    // exit-intent / browse capture
)

// Status — follow-up lifecycle.
const (
	StatusNew       = "NEW"
	StatusContacted = "CONTACTED"
	StatusConverted = "CONVERTED"
	StatusClosed    = "CLOSED"
)

// Lead mirrors migration leads.
type Lead struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Email       *string    `json:"email,omitempty"`
	Phone       *string    `json:"phone,omitempty"`
	Source      string     `json:"source"`
	Intent      string     `json:"intent"`
	ProgrammeID *uuid.UUID `json:"programme_id,omitempty"`
	CohortID    *uuid.UUID `json:"cohort_id,omitempty"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	Message     *string    `json:"message,omitempty"`
	Status      string     `json:"status"`
	ContactedAt *time.Time `json:"contacted_at,omitempty"`
	ConvertedAt *time.Time `json:"converted_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ValidStatus reports whether s is a lead lifecycle status.
func ValidStatus(s string) bool {
	switch s {
	case StatusNew, StatusContacted, StatusConverted, StatusClosed:
		return true
	}
	return false
}

// Repository — lead store. Implementations:
// internal/repository/postgres, internal/repository/memory.
type Repository interface {
	Create(ctx context.Context, l *Lead) error
	GetByID(ctx context.Context, id uuid.UUID) (*Lead, error)
	List(ctx context.Context, status string, page, pageSize int) ([]Lead, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, at time.Time) error
	// FindRecentOpen returns the most recent NEW lead matching the dedupe key
	// (intent + optional user + optional cohort + source, plus email/phone
	// for anonymous captures) created after `since`, so repeat captures
	// don't spam the ops channel. Nil email+phone matches any contact info.
	FindRecentOpen(ctx context.Context, intent, source string, userID, cohortID *uuid.UUID, email, phone *string, since time.Time) (*Lead, error)
	CountByStatus(ctx context.Context, status string) (int64, error)
	// ListOpenByIntent — NEW leads of an intent created inside
	// (newerThan, olderThan], oldest first. Feeds the payment-abandon
	// WhatsApp nudge cron: old enough that the payer truly stalled, new
	// enough that the intent is still warm.
	ListOpenByIntent(ctx context.Context, intent string, olderThan, newerThan time.Time, limit int) ([]Lead, error)
}
