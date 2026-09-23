package service

import (
	"context"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/waitlist"
)

// WaitlistService — cohort waitlist (feature 6, migration 000079).
//
// Notification is deliberately at-most-once: NotifyFront marks the front
// unnotified entries as notified and returns exactly those rows, so a seat
// opening can never double-email the same learner even under a redelivered
// cron or a concurrent admin action. The caller dispatches the actual
// email/notification for the returned entries.
type WaitlistService struct {
	repo waitlist.Repository
}

func NewWaitlistService(repo waitlist.Repository) *WaitlistService {
	return &WaitlistService{repo: repo}
}

func (s *WaitlistService) Join(ctx context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	return s.repo.Join(ctx, cohortID, userID)
}

func (s *WaitlistService) Leave(ctx context.Context, cohortID, userID uuid.UUID) error {
	return s.repo.Leave(ctx, cohortID, userID)
}

func (s *WaitlistService) Mine(ctx context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	return s.repo.Get(ctx, cohortID, userID)
}

func (s *WaitlistService) ListForCohort(ctx context.Context, cohortID uuid.UUID) ([]waitlist.Entry, error) {
	return s.repo.ListForCohort(ctx, cohortID)
}

func (s *WaitlistService) Count(ctx context.Context, cohortID uuid.UUID) (int, error) {
	return s.repo.Count(ctx, cohortID)
}

// NotifyFront marks the earliest `limit` unnotified entries as notified and
// returns them so the caller can dispatch the notification exactly once.
func (s *WaitlistService) NotifyFront(ctx context.Context, cohortID uuid.UUID, limit int) ([]waitlist.Entry, error) {
	front, err := s.repo.FrontUnnotified(ctx, cohortID, limit)
	if err != nil {
		return nil, err
	}
	notified := make([]waitlist.Entry, 0, len(front))
	for i := range front {
		if err := s.repo.MarkNotified(ctx, front[i].ID); err != nil {
			continue // skip on error; a later run can retry an unmarked row
		}
		notified = append(notified, front[i])
	}
	return notified, nil
}
