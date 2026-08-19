package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

type CouponRepo struct{ db TxQuerier }

func NewCouponRepo(db TxQuerier) *CouponRepo { return &CouponRepo{db: db} }

const couponColumns = `id, code, description, discount_type, discount_value, currency,
	min_order_amount, max_discount_amount, usage_limit, per_user_limit, used_count,
	valid_from, valid_until, is_active, created_by, created_at, updated_at`

func scanCoupon(row interface{ Scan(...any) error }) (*payment.Coupon, error) {
	var c payment.Coupon
	var desc sql.NullString
	var maxDiscount sql.NullFloat64
	var validFrom, validUntil sql.NullTime
	var createdBy uuidNull
	if err := row.Scan(&c.ID, &c.Code, &desc, &c.DiscountType, &c.DiscountValue, &c.Currency,
		&c.MinOrderAmount, &maxDiscount, &c.UsageLimit, &c.PerUserLimit, &c.UsedCount,
		&validFrom, &validUntil, &c.IsActive, &createdBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	if desc.Valid {
		c.Description = &desc.String
	}
	if maxDiscount.Valid {
		c.MaxDiscountAmount = &maxDiscount.Float64
	}
	if validFrom.Valid {
		c.ValidFrom = &validFrom.Time
	}
	if validUntil.Valid {
		c.ValidUntil = &validUntil.Time
	}
	if createdBy.Valid {
		c.CreatedBy = &createdBy.UUID
	}
	return &c, nil
}

func (r *CouponRepo) Create(ctx context.Context, c *payment.Coupon) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO coupons (code, description, discount_type, discount_value, currency,
			min_order_amount, max_discount_amount, usage_limit, per_user_limit, used_count,
			valid_from, valid_until, is_active, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,$13)
		RETURNING id, created_at, updated_at`,
		c.Code, c.Description, c.DiscountType, c.DiscountValue, c.Currency,
		c.MinOrderAmount, c.MaxDiscountAmount, c.UsageLimit, c.PerUserLimit,
		c.ValidFrom, c.ValidUntil, c.IsActive, c.CreatedBy,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: coupon code already exists", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create coupon: %w", err)
	}
	return nil
}

func (r *CouponRepo) GetByCode(ctx context.Context, code string) (*payment.Coupon, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+couponColumns+" FROM coupons WHERE code = $1", code)
	c, err := scanCoupon(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *CouponRepo) GetByID(ctx context.Context, id uuid.UUID) (*payment.Coupon, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+couponColumns+" FROM coupons WHERE id = $1", id)
	c, err := scanCoupon(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *CouponRepo) List(ctx context.Context, page, pageSize int) ([]payment.Coupon, int64, error) {
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM coupons").Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count coupons: %w", err)
	}
	limit := pageSize
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.QueryContext(ctx, "SELECT "+couponColumns+` FROM coupons ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list coupons: %w", err)
	}
	defer rows.Close()
	out := []payment.Coupon{}
	for rows.Next() {
		c, err := scanCoupon(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *c)
	}
	return out, total, rows.Err()
}

func (r *CouponRepo) Update(ctx context.Context, c *payment.Coupon) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE coupons SET description=$2, discount_type=$3, discount_value=$4, currency=$5,
			min_order_amount=$6, max_discount_amount=$7, usage_limit=$8, per_user_limit=$9,
			valid_from=$10, valid_until=$11, is_active=$12, updated_at=NOW()
		WHERE id=$1`, c.ID, c.Description, c.DiscountType, c.DiscountValue, c.Currency,
		c.MinOrderAmount, c.MaxDiscountAmount, c.UsageLimit, c.PerUserLimit,
		c.ValidFrom, c.ValidUntil, c.IsActive)
	if err != nil {
		return fmt.Errorf("update coupon: %w", err)
	}
	return nil
}

func (r *CouponRepo) IncrementUsage(ctx context.Context, id uuid.UUID, by int) error {
	_, err := r.db.ExecContext(ctx, `UPDATE coupons SET used_count = used_count + $1, updated_at=NOW() WHERE id=$2`, by, id)
	if err != nil {
		return fmt.Errorf("increment coupon usage: %w", err)
	}
	return nil
}

func (r *CouponRepo) CountUserRedemptions(ctx context.Context, couponID, userID uuid.UUID) (int, error) {
	var n int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2`, couponID, userID).Scan(&n); err != nil {
		return 0, fmt.Errorf("count coupon redemptions: %w", err)
	}
	return n, nil
}

func (r *CouponRepo) RecordRedemption(ctx context.Context, couponID, userID, orderID uuid.UUID, discount float64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_amount)
		VALUES ($1,$2,$3,$4)`, couponID, userID, orderID, discount)
	if err != nil {
		return fmt.Errorf("record coupon redemption: %w", err)
	}
	return nil
}

var _ payment.CouponRepository = (*CouponRepo)(nil)
