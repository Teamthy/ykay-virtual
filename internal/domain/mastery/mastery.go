// Package mastery — topic-mastery heatmap read-model (feature 2, migration
// 000074). Mastery per (student, subject, topic) is computed from graded
// attempt results and never fabricated: with no data the heatmap is empty.
package mastery

import (
	"context"

	"github.com/google/uuid"
)

// TopicMastery — one cell of the heatmap.
type TopicMastery struct {
	Subject  string `json:"subject"`
	Topic    string `json:"topic"`
	Attempts int    `json:"attempts"`
	Correct  int    `json:"correct"`
	Mastery  int    `json:"mastery"` // 0-100 percentage
}

// Repository — persistence + recomputation for the mastery read-model.
type Repository interface {
	// RecordResult appends a graded outcome and recomputes the (student,
	// subject, topic) mastery cell. Server-authoritative only.
	RecordResult(ctx context.Context, studentProfileID uuid.UUID, subject, topic string, correct bool) error
	// Mastery returns every cell for a student; subject="" means all subjects.
	Mastery(ctx context.Context, studentProfileID uuid.UUID, subject string) ([]TopicMastery, error)
	// WeakTopics returns cells below a mastery threshold (revision seeding).
	WeakTopics(ctx context.Context, studentProfileID uuid.UUID, subject string, below int) ([]TopicMastery, error)
}
