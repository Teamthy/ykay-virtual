// Package dash — dashboard insight features (migration 000070): lesson
// feedback, leaderboard opt-in / prefs, gradebook, review queue and XP.
// Pure types + repository contracts; computation lives in the service.
package dash

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// LessonFeedback — a learner's rating of a lesson they attended.
type LessonFeedback struct {
	ID               uuid.UUID `json:"id"`
	LessonID         uuid.UUID `json:"lesson_id"`
	StudentProfileID uuid.UUID `json:"student_profile_id"`
	Rating           int       `json:"rating"`
	Comment          *string   `json:"comment,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// Prefs — per-user dashboard preferences.
type Prefs struct {
	UserID           uuid.UUID `json:"user_id"`
	LeaderboardOptIn bool      `json:"leaderboard_opt_in"`
	WeeklyGoal       int       `json:"weekly_goal"`
	Widgets          []string  `json:"widgets"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Repository — persistence for feedback + prefs.
type Repository interface {
	// CreateFeedback records a lesson rating (unique per learner+lesson).
	CreateFeedback(ctx context.Context, f *LessonFeedback) error
	// FeedbackRating returns the existing rating for a learner+lesson (nil if none).
	FeedbackRating(ctx context.Context, lessonID, studentProfileID uuid.UUID) (*int, error)

	GetPrefs(ctx context.Context, userID uuid.UUID) (*Prefs, error)
	UpsertPrefs(ctx context.Context, p *Prefs) error
	// OptedInUserIDs returns the user IDs that opted into a cohort leaderboard.
	OptedInUserIDs(ctx context.Context, limit int) ([]uuid.UUID, error)
}

// XP sources (per action, used to compute a user's score).
const (
	XPLessonWatched  = 10
	XPAssignmentDone = 20
	XPAssessmentPass = 30
	XPCertificate    = 100
)
