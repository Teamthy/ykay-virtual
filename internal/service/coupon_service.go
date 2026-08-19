package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

// CouponService — validates and applies promotional discounts (gap #6).
type CouponService struct {
	repo payment.CouponRepository
	now  func() time.Time
}

func NewCouponService(repo payment.CouponRepository) *CouponService {
	return &CouponService{repo: repo, now: time.Now}
}

// Validate checks a coupon code is usable for a subtotal and returns the coupon
// plus the discount it would apply (no usage is recorded).
func (s *CouponService) Validate(ctx context.Context, code, userID string, subtotal float64) (*payment.Coupon, float64, error) {
	coupon, err := s.validateWithRepo(ctx, s.repo, code, userID, subtotal)
	if err != nil {
		return nil, 0, err
	}
	return coupon, coupon.Calculate(subtotal), nil
}

// ValidateWithRepo validates a coupon against a transaction-scoped repo (used
// inside the booking UoW). No usage is recorded.
func (s *CouponService) ValidateWithRepo(ctx context.Context, repo payment.CouponRepository, code, userID string, subtotal float64) (*payment.Coupon, float64, error) {
	coupon, err := s.validateWithRepo(ctx, repo, code, userID, subtotal)
	if err != nil {
		return nil, 0, err
	}
	return coupon, coupon.Calculate(subtotal), nil
}

// Record records a redemption + increments usage inside the order transaction.
func (s *CouponService) Record(ctx context.Context, repo payment.CouponRepository, couponID, userID, orderID uuid.UUID, discount float64) error {
	if err := repo.RecordRedemption(ctx, couponID, userID, orderID, discount); err != nil {
		return err
	}
	return repo.IncrementUsage(ctx, couponID, 1)
}

// Apply validates a coupon and, if valid, records a redemption + increments
// usage. Call inside the order's transaction before commit.
func (s *CouponService) Apply(ctx context.Context, code, userID string, orderID uuid.UUID, subtotal float64) (*payment.Coupon, float64, error) {
	return s.ApplyWithRepo(ctx, s.repo, code, userID, orderID, subtotal)
}

// ApplyWithRepo is Apply against a transaction-scoped repo.
func (s *CouponService) ApplyWithRepo(ctx context.Context, repo payment.CouponRepository, code, userID string, orderID uuid.UUID, subtotal float64) (*payment.Coupon, float64, error) {
	coupon, err := s.validateWithRepo(ctx, repo, code, userID, subtotal)
	if err != nil {
		return nil, 0, err
	}
	discount := coupon.Calculate(subtotal)
	if err := repo.RecordRedemption(ctx, coupon.ID, uuid.MustParse(userID), orderID, discount); err != nil {
		return nil, 0, err
	}
	if err := repo.IncrementUsage(ctx, coupon.ID, 1); err != nil {
		return nil, 0, err
	}
	return coupon, discount, nil
}

func (s *CouponService) validateWithRepo(ctx context.Context, repo payment.CouponRepository, code, userID string, subtotal float64) (*payment.Coupon, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return nil, fmt.Errorf("%w: coupon code is required", domain.ErrInvalidInput)
	}
	coupon, err := repo.GetByCode(ctx, code)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, fmt.Errorf("%w: coupon not found", domain.ErrInvalidInput)
		}
		return nil, err
	}
	if err := coupon.Validate(s.now().UTC(), subtotal); err != nil {
		return nil, fmt.Errorf("%w: %s", domain.ErrInvalidInput, err.Error())
	}
	// Per-user limit.
	if coupon.PerUserLimit > 0 {
		if userID != "" {
			uid, perr := uuid.Parse(userID)
			if perr == nil {
				n, cerr := repo.CountUserRedemptions(ctx, coupon.ID, uid)
				if cerr != nil {
					return nil, cerr
				}
				if n >= coupon.PerUserLimit {
					return nil, fmt.Errorf("%w: you have already used this coupon", domain.ErrConflict)
				}
			}
		}
	}
	return coupon, nil
}

// CreateCouponInput — admin coupon definition.
type CreateCouponInput struct {
	Code              string
	Description       *string
	DiscountType      payment.CouponDiscountType
	DiscountValue     float64
	Currency          string
	MinOrderAmount    float64
	MaxDiscountAmount *float64
	UsageLimit        int
	PerUserLimit      int
	ValidFrom         *time.Time
	ValidUntil        *time.Time
}

// CreateCoupon — admin creates a coupon.
func (s *CouponService) CreateCoupon(ctx context.Context, adminID uuid.UUID, in CreateCouponInput) (*payment.Coupon, error) {
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	if code == "" {
		return nil, fmt.Errorf("%w: coupon code is required", domain.ErrInvalidInput)
	}
	if in.DiscountType != payment.CouponPercent && in.DiscountType != payment.CouponFixed {
		return nil, fmt.Errorf("%w: discount_type must be PERCENT or FIXED", domain.ErrInvalidInput)
	}
	if in.DiscountValue < 0 || (in.DiscountType == payment.CouponPercent && in.DiscountValue > 100) {
		return nil, fmt.Errorf("%w: invalid discount_value", domain.ErrInvalidInput)
	}
	if in.Currency == "" {
		in.Currency = "NGN"
	}
	coupon := &payment.Coupon{
		Code:              code,
		Description:       in.Description,
		DiscountType:      in.DiscountType,
		DiscountValue:     in.DiscountValue,
		Currency:          in.Currency,
		MinOrderAmount:    in.MinOrderAmount,
		MaxDiscountAmount: in.MaxDiscountAmount,
		UsageLimit:        in.UsageLimit,
		PerUserLimit:      in.PerUserLimit,
		ValidFrom:         in.ValidFrom,
		ValidUntil:        in.ValidUntil,
		IsActive:          true,
		CreatedBy:         &adminID,
	}
	if err := s.repo.Create(ctx, coupon); err != nil {
		return nil, err
	}
	return coupon, nil
}

// ListCoupons — admin coupon listing.
func (s *CouponService) ListCoupons(ctx context.Context, page, pageSize int) ([]payment.Coupon, int64, error) {
	if s.repo == nil {
		return []payment.Coupon{}, 0, nil
	}
	return s.repo.List(ctx, page, pageSize)
}
