package service

import (
	"context"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/mastery"
)

// MasteryService — topic-mastery heatmap (feature 2). Read-model populated by
// server-authoritative grading (CBT); the client only ever reads it.
type MasteryService struct {
	repo mastery.Repository
}

func NewMasteryService(repo mastery.Repository) *MasteryService {
	return &MasteryService{repo: repo}
}

func (s *MasteryService) Record(ctx context.Context, studentProfileID uuid.UUID, subject, topic string, correct bool) error {
	if subject == "" {
		subject = "general"
	}
	if topic == "" {
		topic = "General"
	}
	return s.repo.RecordResult(ctx, studentProfileID, subject, topic, correct)
}

func (s *MasteryService) Mastery(ctx context.Context, studentProfileID uuid.UUID, subject string) ([]mastery.TopicMastery, error) {
	return s.repo.Mastery(ctx, studentProfileID, subject)
}

func (s *MasteryService) WeakTopics(ctx context.Context, studentProfileID uuid.UUID, subject string, below int) ([]mastery.TopicMastery, error) {
	if below <= 0 || below > 100 {
		below = 60
	}
	return s.repo.WeakTopics(ctx, studentProfileID, subject, below)
}

// Recorder returns the fire-and-forget recorder wired into CBT grading. Errors
// are swallowed: a failed analytics write must never fail a graded attempt.
func (s *MasteryService) Recorder() func(context.Context, uuid.UUID, string, string, bool) {
	return func(ctx context.Context, studentProfileID uuid.UUID, subject, topic string, correct bool) {
		_ = s.Record(ctx, studentProfileID, subject, topic, correct)
	}
}
