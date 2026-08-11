package referral

import (
	"context"

	"github.com/google/uuid"
)

// ReferralRepository — the full referral programme surface
// (migration 000009). Reward is credited to the referrer's wallet once the
// referred user's first order is paid (QUALIFIED → REWARDED, idempotent).

type ReferralRepository interface {
	// Codes
	CreateCode(ctx context.Context, userID uuid.UUID, code string) (*ReferralCode, error)
	GetCodeByUserID(ctx context.Context, userID uuid.UUID) (*ReferralCode, error)
	GetCode(ctx context.Context, code string) (*ReferralCode, error)

	// Referrals
	Create(ctx context.Context, r *Referral) error
	GetByReferredUser(ctx context.Context, referredUserID uuid.UUID) (*Referral, error)
	Qualify(ctx context.Context, referralID, orderID uuid.UUID) error
	MarkRewarded(ctx context.Context, referralID uuid.UUID) error
	ListByReferrer(ctx context.Context, referrerUserID uuid.UUID, limit int) ([]Referral, error)

	// Rewards
	CreateReward(ctx context.Context, r *Reward) error
	GetRewardByReferral(ctx context.Context, referralID uuid.UUID) (*Reward, error)

	// Admin
	List(ctx context.Context, params ReferralListParams) ([]Referral, int64, error)
	Count(ctx context.Context) (int64, error)
}

// ReferralListParams — admin list filters.
type ReferralListParams struct {
	Status   string // "", PENDING, QUALIFIED, REWARDED, EXPIRED
	Page     int
	PageSize int
}

// ReferralCodeGenerator — creates unique, human-friendly codes (service layer).
type ReferralCodeGenerator interface {
	Generate() string
}
