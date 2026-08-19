package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func newCouponSvc() *CouponService {
	s := NewCouponService(memory.NewCouponMemory())
	s.now = func() time.Time { return time.Date(2026, 8, 1, 12, 0, 0, 0, time.UTC) }
	return s
}

func TestCoupon_PercentDiscount(t *testing.T) {
	ctx := context.Background()
	svc := newCouponSvc()
	admin := uuid.New()
	until := svc.now().Add(30 * 24 * time.Hour)
	coupon, err := svc.CreateCoupon(ctx, admin, CreateCouponInput{
		Code: "save10", DiscountType: payment.CouponPercent, DiscountValue: 10, PerUserLimit: 5,
		ValidUntil: &until,
	})
	require.NoError(t, err)
	require.Equal(t, "SAVE10", coupon.Code)

	user := uuid.New()
	got, discount, err := svc.Validate(ctx, "save10", user.String(), 50000)
	require.NoError(t, err)
	require.Equal(t, 5000.0, discount)
	require.Equal(t, "SAVE10", got.Code)
}

func TestCoupon_FixedAndCapped(t *testing.T) {
	ctx := context.Background()
	svc := newCouponSvc()
	admin := uuid.New()
	max := 2000.0
	_, err := svc.CreateCoupon(ctx, admin, CreateCouponInput{
		Code: "FIX2000", DiscountType: payment.CouponFixed, DiscountValue: 5000,
		MaxDiscountAmount: &max, // cap below the fixed value
	})
	require.NoError(t, err)
	_, discount, err := svc.Validate(ctx, "FIX2000", uuid.New().String(), 100000)
	require.NoError(t, err)
	require.Equal(t, 2000.0, discount) // capped, and never exceeds subtotal

	// Discount never exceeds subtotal for a small order.
	_, discount, err = svc.Validate(ctx, "FIX2000", uuid.New().String(), 1500)
	require.NoError(t, err)
	require.Equal(t, 1500.0, discount)
}

func TestCoupon_InvalidCases(t *testing.T) {
	ctx := context.Background()
	svc := newCouponSvc()
	admin := uuid.New()

	// Unknown code.
	_, _, err := svc.Validate(ctx, "NOPE", uuid.New().String(), 5000)
	require.Error(t, err)

	// Inactive.
	_, err = svc.CreateCoupon(ctx, admin, CreateCouponInput{Code: "OFF", DiscountType: payment.CouponPercent, DiscountValue: 5})
	require.NoError(t, err)
	// CreateCoupon always sets active true; test expiry instead:
	past := svc.now().Add(-time.Hour)
	_, err = svc.CreateCoupon(ctx, admin, CreateCouponInput{Code: "EXPIRED", DiscountType: payment.CouponPercent, DiscountValue: 5, ValidUntil: &past})
	require.NoError(t, err)
	_, _, err = svc.Validate(ctx, "EXPIRED", uuid.New().String(), 5000)
	require.Error(t, err)

	// Min order not met.
	future := svc.now().Add(time.Hour)
	_, err = svc.CreateCoupon(ctx, admin, CreateCouponInput{Code: "MIN500", DiscountType: payment.CouponFixed, DiscountValue: 100, MinOrderAmount: 500, ValidFrom: &past, ValidUntil: &future})
	require.NoError(t, err)
	_, _, err = svc.Validate(ctx, "MIN500", uuid.New().String(), 100)
	require.Error(t, err)

	// Per-user limit.
	_, err = svc.CreateCoupon(ctx, admin, CreateCouponInput{Code: "ONCE", DiscountType: payment.CouponFixed, DiscountValue: 100, PerUserLimit: 1})
	require.NoError(t, err)
	user := uuid.New()
	orderID := uuid.New()
	_, _, err = svc.Apply(ctx, "ONCE", user.String(), orderID, 5000)
	require.NoError(t, err)
	_, _, err = svc.Apply(ctx, "ONCE", user.String(), uuid.New(), 5000)
	require.Error(t, err, "per-user limit should block a second use")
}

func TestCoupon_UsageLimit(t *testing.T) {
	ctx := context.Background()
	svc := newCouponSvc()
	admin := uuid.New()
	_, err := svc.CreateCoupon(ctx, admin, CreateCouponInput{Code: "LIMIT2", DiscountType: payment.CouponPercent, DiscountValue: 10, UsageLimit: 2})
	require.NoError(t, err)
	_, _, err = svc.Apply(ctx, "LIMIT2", uuid.New().String(), uuid.New(), 5000)
	require.NoError(t, err)
	_, _, err = svc.Apply(ctx, "LIMIT2", uuid.New().String(), uuid.New(), 5000)
	require.NoError(t, err)
	_, _, err = svc.Apply(ctx, "LIMIT2", uuid.New().String(), uuid.New(), 5000)
	require.Error(t, err, "usage limit should be exhausted after 2 applies")
}
