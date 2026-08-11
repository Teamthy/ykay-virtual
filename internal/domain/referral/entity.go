package referral

import (
	"time"
	"github.com/google/uuid"
)

type Referral struct {
	ID              uuid.UUID  `json:"id"`
	ReferrerUserID  uuid.UUID  `json:"referrer_user_id"`
	ReferredUserID  uuid.UUID  `json:"referred_user_id"`
	ReferralCodeID  uuid.UUID  `json:"referral_code_id"`
	OrderID         *uuid.UUID `json:"order_id,omitempty"`
	RewardAmount    float64    `json:"reward_amount"`
	Status          string     `json:"status"`
	QualifiedAt     *time.Time `json:"qualified_at,omitempty"`
	RewardedAt      *time.Time `json:"rewarded_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type ReferralCode struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Code      string    `json:"code"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Reward struct {
	ID          uuid.UUID  `json:"id"`
	ReferralID  uuid.UUID  `json:"referral_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Amount      float64    `json:"amount"`
	Currency    string     `json:"currency"`
	Status      string     `json:"status"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
