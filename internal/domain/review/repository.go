package review

import (
	"context"

	"github.com/google/uuid"
)

// ReviewRepository — admin moderation surface (consent-gated reviews,
// migration 000009). Reviews are PENDING until moderated; is_public +
// consent_given gate visibility (SEO Review JSON-LD only ever uses
// published, consented reviews).

type ReviewRepository interface {
	List(ctx context.Context, params ReviewListParams) ([]Review, int64, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Review, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status ReviewStatus, moderatedBy *uuid.UUID) error
	CountByStatus(ctx context.Context, status ReviewStatus) (int64, error)
}

type ReviewListParams struct {
	Status   string // "", PENDING, PUBLISHED, HIDDEN, FLAGGED
	TutorID  *uuid.UUID
	Page     int
	PageSize int
}
