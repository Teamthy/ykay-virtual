// Package waitlist — cohort waitlist alerts (feature 6, migration 000079).
// When a cohort is full, learners join an ordered waitlist; when a seat opens
// the front of the waitlist is notified once (notified_at makes it idempotent).
// Pure types + repository contract; the notification side-effect lives in the
// service so callers never send email twice for the same seat opening.
package waitlist

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Entry — one learner's place in a cohort's waitlist.
type Entry struct {
	ID         uuid.UUID  `json:"id"`
	CohortID   uuid.UUID  `json:"cohort_id"`
	UserID     uuid.UUID  `json:"user_id"`
	Position   int        `json:"position"`
	NotifiedAt *time.Time `json:"notified_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// Repository — persistence for cohort waitlists.
type Repository interface {
	// Join inserts (or returns the existing) waitlist entry for a user+cohort,
	// assigning the next position. Idempotent per (cohort, user).
	Join(ctx context.Context, cohortID, userID uuid.UUID) (*Entry, error)
	// Get returns a user's entry for a cohort (nil if not waiting).
	Get(ctx context.Context, cohortID, userID uuid.UUID) (*Entry, error)
	// ListForCohort returns the waitlist ordered by position (admin view).
	ListForCohort(ctx context.Context, cohortID uuid.UUID) ([]Entry, error)
	// Count returns how many learners are waiting (for the visible seat state).
	Count(ctx context.Context, cohortID uuid.UUID) (int, error)
	// Leave removes a user from a cohort's waitlist.
	Leave(ctx context.Context, cohortID, userID uuid.UUID) error
	// FrontUnnotified returns the earliest entries not yet notified for a cohort.
	FrontUnnotified(ctx context.Context, cohortID uuid.UUID, limit int) ([]Entry, error)
	// MarkNotified stamps notified_at so a seat opening never double-notifies.
	MarkNotified(ctx context.Context, id uuid.UUID) error
	// NextPosition computes the next waitlist position for a cohort.
	NextPosition(ctx context.Context, cohortID uuid.UUID) (int, error)
}
