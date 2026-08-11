package review

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ReviewRepository — full review surface (migration 000009).
// Public reads return PUBLISHED + is_public + consent_given reviews only
// (Review JSON-LD rule). Moderation lives in the admin console.

type ReviewRepository interface {
	Create(ctx context.Context, r *Review) error
	GetByID(ctx context.Context, id uuid.UUID) (*Review, error)
	List(ctx context.Context, params ReviewListParams) ([]Review, int64, error)
	ListPublishedByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]Review, error)
	ExistsForReviewer(ctx context.Context, reviewerUserID, tutorProfileID uuid.UUID) (bool, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status ReviewStatus, moderatedBy *uuid.UUID) error
	CountByStatus(ctx context.Context, status ReviewStatus) (int64, error)
	// RecomputeTutorRating recalculates tutor_profiles.rating_avg/count from
	// PUBLISHED + is_public + consent_given reviews (atomic SQL).
	RecomputeTutorRating(ctx context.Context, tutorProfileID uuid.UUID) error
}

type ReviewListParams struct {
	Status   string // "", PENDING, PUBLISHED, HIDDEN, FLAGGED
	TutorID  *uuid.UUID
	Page     int
	PageSize int
}

var _ = time.Now
