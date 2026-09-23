// Package lessonnote — lesson bookmarks & timestamped player notes (feature 5,
// migration 000078). Distinct from booking.LessonNote (the tutor's post-lesson
// summary): these are per-participant jump-to notes/bookmarks inside the LMS
// lesson/recording player, shared with the other participants of the lesson.
package lessonnote

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// PlayerNote — a timestamped note or bookmark by one participant.
type PlayerNote struct {
	ID           uuid.UUID `json:"id"`
	LessonID     uuid.UUID `json:"lesson_id"`
	UserID       uuid.UUID `json:"user_id"`
	Role         string    `json:"role"` // STUDENT|PARENT|TUTOR
	TimestampSec int       `json:"timestamp_sec"`
	IsBookmark   bool      `json:"is_bookmark"`
	Text         string    `json:"text"`
	CreatedAt    time.Time `json:"created_at"`
}

// Repository — persistence for player notes/bookmarks.
type Repository interface {
	Add(ctx context.Context, n *PlayerNote) error
	// ListByLesson returns every participant's notes for a lesson, ordered by
	// timestamp (the shared participant view).
	ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]PlayerNote, error)
	// ListByUser returns one user's notes/bookmarks for a lesson.
	ListByUser(ctx context.Context, userID, lessonID uuid.UUID) ([]PlayerNote, error)
	// Delete removes a note — only its owner may delete it.
	Delete(ctx context.Context, id, userID uuid.UUID) error
}
