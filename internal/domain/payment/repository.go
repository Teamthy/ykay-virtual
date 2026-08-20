package payment

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository interfaces for orders, payments, escrow and payouts.
// Money mutations MUST run inside DB transactions (service layer) — these
// interfaces are transaction-agnostic; the postgres implementation exposes
// WithTx to the service via internal/repository/postgres.Postgres.

type OrderRepository interface {
	Create(ctx context.Context, o *Order) error
	CreateItem(ctx context.Context, item *OrderItem) error
	GetByID(ctx context.Context, id uuid.UUID) (*Order, error)
	GetByIDempotencyKey(ctx context.Context, key string) (*Order, error)
	GetByNumber(ctx context.Context, number string) (*Order, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status OrderStatus) error
	Update(ctx context.Context, o *Order) error
	ListItems(ctx context.Context, orderID uuid.UUID) ([]OrderItem, error)
	// ListItemsByOrderIDs batch-loads items for many orders in one query
	// (parent dashboard — no N+1). Empty ids returns an empty map.
	ListItemsByOrderIDs(ctx context.Context, orderIDs []uuid.UUID) (map[uuid.UUID][]OrderItem, error)
	ListByParentUserID(ctx context.Context, parentUserID uuid.UUID, limit, offset int) ([]Order, int64, error)
	// ListAll — admin payments view (phase 38).
	ListAll(ctx context.Context, limit, offset int) ([]Order, int64, error)
}

type PaymentRepository interface {
	Create(ctx context.Context, p *Payment) error
	GetByID(ctx context.Context, id uuid.UUID) (*Payment, error)
	GetByProviderReference(ctx context.Context, provider PaymentProvider, reference string) (*Payment, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status PaymentStatus, paidAt *time.Time) error
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]Payment, error)
}

type PaymentWebhookRepository interface {
	// Create is idempotent: the underlying unique constraint on
	// provider_reference means a concurrent duplicate insert returns
	// ErrAlreadyExists — the service treats that as "already processed".
	Create(ctx context.Context, w *PaymentWebhook) error
	GetByProviderReference(ctx context.Context, provider PaymentProvider, reference string) (*PaymentWebhook, error)
	MarkProcessed(ctx context.Context, id uuid.UUID) error
}

type EscrowHoldRepository interface {
	Create(ctx context.Context, h *EscrowHold) error
	GetByID(ctx context.Context, id uuid.UUID) (*EscrowHold, error)
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]EscrowHold, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status EscrowStatus, releasedAt *time.Time, disputeReason *string) error
	// ReleaseIfHeld — atomic compare-and-set: transitions an escrow hold from
	// HELD to the target status ONLY if it is still HELD. Returns true when it
	// performed the transition, false when the hold was already in another
	// state (concurrent release/refund won the race). This is the guarded
	// transition that prevents double settlement (YK-007).
	ReleaseIfHeld(ctx context.Context, id uuid.UUID, status EscrowStatus, releasedAt *time.Time, disputeReason *string) (bool, error)
	// ListStaleHeld lists HELD holds whose release_at has passed — used by the
	// expire_stale_booking_holds cron (Tuteria parity: 3-day auto release).
	ListStaleHeld(ctx context.Context, now time.Time, limit int) ([]EscrowHold, error)
	ListByTutorProfileID(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]EscrowHold, error)
}

type PayoutRepository interface {
	Create(ctx context.Context, p *Payout) error
	GetByEscrowHoldID(ctx context.Context, escrowHoldID uuid.UUID) (*Payout, error)
	ListByStatus(ctx context.Context, status PayoutStatus, limit int) ([]Payout, error)
	ListByTutorProfileID(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]Payout, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status PayoutStatus, providerRef *string, processedAt *time.Time) error
}

type WalletRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*Wallet, error)
	Create(ctx context.Context, w *Wallet) error
	// GetOrCreate ensures a wallet row exists for the user (created on first
	// order so every paying parent has a wallet).
	GetOrCreate(ctx context.Context, userID uuid.UUID, currency string) (*Wallet, error)
	// Credit/Debit mutate balance atomically (UPDATE ... RETURNING inside tx).
	Credit(ctx context.Context, userID uuid.UUID, amount float64) error
	Debit(ctx context.Context, userID uuid.UUID, amount float64) error
}

// CouponRepository — coupon/discount engine (gap #6).
type CouponRepository interface {
	Create(ctx context.Context, c *Coupon) error
	GetByCode(ctx context.Context, code string) (*Coupon, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Coupon, error)
	List(ctx context.Context, page, pageSize int) ([]Coupon, int64, error)
	Update(ctx context.Context, c *Coupon) error
	IncrementUsage(ctx context.Context, id uuid.UUID, by int) error
	// CountUserRedemptions returns how many times a user has used a coupon.
	CountUserRedemptions(ctx context.Context, couponID, userID uuid.UUID) (int, error)
	// RecordRedemption stores one redemption linked to an order.
	RecordRedemption(ctx context.Context, couponID, userID, orderID uuid.UUID, discount float64) error
}
