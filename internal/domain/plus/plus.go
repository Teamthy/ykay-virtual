// Package plus — the YK-Virtual Plus premium tier (migration 000066): subscription
// plans, active-subscription entitlements, and per-feature daily usage counters
// that gate the already-built premium features (verified certificates, the full
// practice-exam vault, recorded-library transcripts, and a higher AI-assistant
// allowance). Marketing page: client/app/(marketing)/plus.
package plus

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Plan codes.
const (
	PlanPlus       = "PLUS"
	PlanPlusFamily = "PLUS_FAMILY"
	PlanPlusTeams  = "PLUS_TEAMS"
)

// Feature keys (used with plus_usage counters).
const (
	FeatureAIAssistant = "ai_assistant"
)

// Free daily allowances vs Plus allowances for usage-gated features.
const (
	// AIAssistFreePerDay — how many AI assistant queries a free account gets
	// each day before the premium upgrade nudge.
	AIAssistFreePerDay = 10
	// AIAssistPlusPerDay — Plus accounts get a much higher daily allowance.
	AIAssistPlusPerDay = 100
)

// SubscriptionStatus — lifecycle of a subscription.
type SubscriptionStatus string

const (
	SubActive    SubscriptionStatus = "ACTIVE"
	SubTrial     SubscriptionStatus = "TRIAL"
	SubExpired   SubscriptionStatus = "EXPIRED"
	SubCancelled SubscriptionStatus = "CANCELLED"
)

// Plan — one purchasable subscription tier.
type Plan struct {
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Billing   string    `json:"billing"`
	Price     float64   `json:"price"`
	Currency  string    `json:"currency"`
	TrialDays int       `json:"trial_days"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// Subscription — a user's purchase of a plan.
type Subscription struct {
	ID          uuid.UUID          `json:"id"`
	UserID      uuid.UUID          `json:"user_id"`
	PlanCode    string             `json:"plan_code"`
	Status      SubscriptionStatus `json:"status"`
	StartedAt   time.Time          `json:"started_at"`
	TrialEndsAt *time.Time         `json:"trial_ends_at,omitempty"`
	EndsAt      time.Time          `json:"ends_at"`
	AutoRenew   bool               `json:"auto_renew"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// Usage — a per-user, per-feature, per-day counter.
type Usage struct {
	UserID  uuid.UUID `json:"user_id"`
	Feature string    `json:"feature"`
	Day     time.Time `json:"day"` // date (midnight UTC)
	Count   int       `json:"count"`
}

// EntitlementError — returned when an action requires an active Plus plan.
var ErrPremiumRequired = errors.New("this feature requires an active YK-Virtual Plus plan")

// Repository — persistence for plans, subscriptions and usage.
type Repository interface {
	// Plans
	ListPlans(ctx context.Context, activeOnly bool) ([]Plan, error)
	GetPlanByCode(ctx context.Context, code string) (*Plan, error)
	GetPlanByID(ctx context.Context, id uuid.UUID) (*Plan, error)
	UpsertPlan(ctx context.Context, p *Plan) error

	// Subscriptions
	GetActiveByUser(ctx context.Context, userID uuid.UUID, now time.Time) (*Subscription, error)
	// ListActiveUserIDs returns the distinct user IDs with an ACTIVE/TRIAL
	// subscription that has not ended (feeds the Plus weekly-report cron).
	ListActiveUserIDs(ctx context.Context, now time.Time) ([]uuid.UUID, error)
	Activate(ctx context.Context, s *Subscription) error
	Cancel(ctx context.Context, id uuid.UUID) error
	// ExpireEnded marks ACTIVE/TRIAL subscriptions whose term has passed as
	// EXPIRED, so the entitlement gate stops returning access. Returns count.
	ExpireEnded(ctx context.Context, now time.Time) (int, error)

	// Usage
	IncrementUsage(ctx context.Context, userID uuid.UUID, feature string, day time.Time) (int, error)
	GetUsage(ctx context.Context, userID uuid.UUID, feature string, day time.Time) (int, error)
}
