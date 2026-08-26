package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/plus"
)

// PlusRepo — postgres implementation of plus.Repository (migration 000066).
type PlusRepo struct{ db TxQuerier }

func NewPlusRepo(db TxQuerier) *PlusRepo { return &PlusRepo{db: db} }

func (r *PlusRepo) ListPlans(ctx context.Context, activeOnly bool) ([]plus.Plan, error) {
	q := `SELECT id, code, name, billing, price, currency, trial_days, is_active, created_at
	      FROM subscription_plans`
	if activeOnly {
		q += ` WHERE is_active = TRUE`
	}
	q += ` ORDER BY price ASC`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list plus plans: %w", err)
	}
	defer rows.Close()
	out := []plus.Plan{}
	for rows.Next() {
		p := plus.Plan{}
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Billing, &p.Price, &p.Currency, &p.TrialDays, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *PlusRepo) GetPlanByCode(ctx context.Context, code string) (*plus.Plan, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, code, name, billing, price, currency, trial_days, is_active, created_at
		 FROM subscription_plans WHERE code = $1`, code)
	p := plus.Plan{}
	if err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Billing, &p.Price, &p.Currency, &p.TrialDays, &p.IsActive, &p.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PlusRepo) GetPlanByID(ctx context.Context, id uuid.UUID) (*plus.Plan, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, code, name, billing, price, currency, trial_days, is_active, created_at
		 FROM subscription_plans WHERE id = $1`, id)
	p := plus.Plan{}
	if err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Billing, &p.Price, &p.Currency, &p.TrialDays, &p.IsActive, &p.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PlusRepo) UpsertPlan(ctx context.Context, p *plus.Plan) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO subscription_plans (code, name, billing, price, currency, trial_days, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (code) DO UPDATE SET
			name=EXCLUDED.name, billing=EXCLUDED.billing, price=EXCLUDED.price,
			currency=EXCLUDED.currency, trial_days=EXCLUDED.trial_days,
			is_active=EXCLUDED.is_active, updated_at=NOW()`,
		p.Code, p.Name, p.Billing, p.Price, p.Currency, p.TrialDays, p.IsActive)
	if err != nil {
		return fmt.Errorf("upsert plus plan: %w", err)
	}
	return nil
}

func (r *PlusRepo) GetActiveByUser(ctx context.Context, userID uuid.UUID, now time.Time) (*plus.Subscription, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, plan_code, status, started_at, trial_ends_at, ends_at, auto_renew, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1 AND status IN ('TRIAL','ACTIVE') AND ends_at > $2
		ORDER BY ends_at DESC LIMIT 1`, userID, now)
	s, err := scanSubscription(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *PlusRepo) Activate(ctx context.Context, s *plus.Subscription) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO subscriptions (user_id, plan_code, status, started_at, trial_ends_at, ends_at, auto_renew)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at, updated_at`,
		s.UserID, s.PlanCode, s.Status, s.StartedAt, s.TrialEndsAt, s.EndsAt, s.AutoRenew,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return fmt.Errorf("activate plus subscription: %w", err)
	}
	return nil
}

func (r *PlusRepo) Cancel(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE subscriptions SET status='CANCELLED', ends_at=NOW(), auto_renew=FALSE, updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("cancel plus subscription: %w", err)
	}
	return nil
}

func scanSubscription(row interface{ Scan(...any) error }) (*plus.Subscription, error) {
	s := plus.Subscription{}
	var trial sql.NullTime
	if err := row.Scan(&s.ID, &s.UserID, &s.PlanCode, &s.Status, &s.StartedAt, &trial, &s.EndsAt, &s.AutoRenew, &s.CreatedAt, &s.UpdatedAt); err != nil {
		return nil, err
	}
	if trial.Valid {
		t := trial.Time
		s.TrialEndsAt = &t
	}
	return &s, nil
}

func (r *PlusRepo) IncrementUsage(ctx context.Context, userID uuid.UUID, feature string, day time.Time) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO plus_usage (user_id, feature, day, count)
		VALUES ($1,$2,$3,1)
		ON CONFLICT (user_id, feature, day) DO UPDATE SET count = plus_usage.count + 1
		RETURNING count`, userID, feature, day).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("increment plus usage: %w", err)
	}
	return count, nil
}

func (r *PlusRepo) GetUsage(ctx context.Context, userID uuid.UUID, feature string, day time.Time) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT count FROM plus_usage WHERE user_id=$1 AND feature=$2 AND day=$3`,
		userID, feature, day).Scan(&count)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}

func (r *PlusRepo) ListActiveUserIDs(ctx context.Context, now time.Time) ([]uuid.UUID, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT user_id FROM subscriptions
		WHERE status IN ('ACTIVE','TRIAL') AND ends_at > $1`, now)
	if err != nil {
		return nil, fmt.Errorf("list active plus user ids: %w", err)
	}
	defer rows.Close()
	out := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (r *PlusRepo) ExpireEnded(ctx context.Context, now time.Time) (int, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE subscriptions SET status='EXPIRED', auto_renew=FALSE, updated_at=NOW()
		WHERE status IN ('ACTIVE','TRIAL') AND ends_at <= $1`, now)
	if err != nil {
		return 0, fmt.Errorf("expire ended plus subscriptions: %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

var _ plus.Repository = (*PlusRepo)(nil)
