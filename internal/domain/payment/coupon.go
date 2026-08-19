package payment

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CouponDiscountType — how a coupon reduces an order.
type CouponDiscountType string

const (
	CouponPercent CouponDiscountType = "PERCENT"
	CouponFixed   CouponDiscountType = "FIXED"
)

// Coupon — a promotional discount applied at checkout (gap #6).
type Coupon struct {
	ID                uuid.UUID          `json:"id"`
	Code              string             `json:"code"`
	Description       *string            `json:"description,omitempty"`
	DiscountType      CouponDiscountType `json:"discount_type"`
	DiscountValue     float64            `json:"discount_value"`
	Currency          string             `json:"currency"`
	MinOrderAmount    float64            `json:"min_order_amount"`
	MaxDiscountAmount *float64           `json:"max_discount_amount,omitempty"`
	UsageLimit        int                `json:"usage_limit"`    // 0 = unlimited
	PerUserLimit      int                `json:"per_user_limit"` // 0 = unlimited
	UsedCount         int                `json:"used_count"`
	ValidFrom         *time.Time         `json:"valid_from,omitempty"`
	ValidUntil        *time.Time         `json:"valid_until,omitempty"`
	IsActive          bool               `json:"is_active"`
	CreatedBy         *uuid.UUID         `json:"created_by,omitempty"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
}

// Validate checks the coupon is active, in-window, not exhausted, and that the
// subtotal meets the minimum. It returns a user-facing error otherwise.
func (c *Coupon) Validate(now time.Time, subtotal float64) error {
	if c == nil {
		return errors.New("coupon not found")
	}
	if !c.IsActive {
		return errors.New("coupon is not active")
	}
	if c.ValidFrom != nil && now.Before(*c.ValidFrom) {
		return errors.New("coupon is not valid yet")
	}
	if c.ValidUntil != nil && now.After(*c.ValidUntil) {
		return errors.New("coupon has expired")
	}
	if c.UsageLimit > 0 && c.UsedCount >= c.UsageLimit {
		return errors.New("coupon has reached its usage limit")
	}
	if subtotal < c.MinOrderAmount {
		return fmt.Errorf("order must be at least %.2f to use this coupon", c.MinOrderAmount)
	}
	return nil
}

// Calculate returns the discount to apply for a given subtotal.
func (c *Coupon) Calculate(subtotal float64) float64 {
	var d float64
	switch c.DiscountType {
	case CouponPercent:
		d = subtotal * c.DiscountValue / 100
	case CouponFixed:
		d = c.DiscountValue
	}
	// The max cap applies to both types, and the discount never exceeds the
	// order subtotal (and is never negative).
	if c.MaxDiscountAmount != nil && d > *c.MaxDiscountAmount {
		d = *c.MaxDiscountAmount
	}
	if d > subtotal {
		d = subtotal
	}
	if d < 0 {
		d = 0
	}
	return d
}
