package referral

import (
	"context"

	"github.com/google/uuid"
)

// ReferralRepository — admin read surface for the referral programme
// (migration 000009_review_referral).

type ReferralRepository interface {
	List(ctx context.Context, params ReferralListParams) ([]Referral, int64, error)
	Count(ctx context.Context) (int64, error)
}

type ReferralListParams struct {
	Status   string // "", PENDING, QUALIFIED, REWARDED, EXPIRED
	Page     int
	PageSize int
}

var _ = uuid.Nil
