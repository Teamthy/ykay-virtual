package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/waitlist"
)

// WaitlistRepo — postgres implementation of waitlist.Repository (migration 000079).
type WaitlistRepo struct{ db TxQuerier }

func NewWaitlistRepo(db TxQuerier) *WaitlistRepo { return &WaitlistRepo{db: db} }

func (r *WaitlistRepo) NextPosition(ctx context.Context, cohortID uuid.UUID) (int, error) {
	var next int
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(position), 0) + 1 FROM cohort_waitlist WHERE cohort_id = $1`, cohortID).Scan(&next)
	if err != nil {
		return 0, fmt.Errorf("next waitlist position: %w", err)
	}
	return next, nil
}

func (r *WaitlistRepo) Join(ctx context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	// Idempotent per (cohort, user): return the existing row when present.
	var existing waitlist.Entry
	var notifiedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, cohort_id, user_id, position, notified_at, created_at
		FROM cohort_waitlist WHERE cohort_id=$1 AND user_id=$2`, cohortID, userID).
		Scan(&existing.ID, &existing.CohortID, &existing.UserID, &existing.Position, &notifiedAt, &existing.CreatedAt)
	if err == nil {
		if notifiedAt.Valid {
			t := notifiedAt.Time
			existing.NotifiedAt = &t
		}
		return &existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("waitlist lookup: %w", err)
	}
	pos, err := r.NextPosition(ctx, cohortID)
	if err != nil {
		return nil, err
	}
	e := &waitlist.Entry{}
	err = r.db.QueryRowContext(ctx, `
		INSERT INTO cohort_waitlist (cohort_id, user_id, position)
		VALUES ($1,$2,$3)
		RETURNING id, cohort_id, user_id, position, created_at`,
		cohortID, userID, pos).
		Scan(&e.ID, &e.CohortID, &e.UserID, &e.Position, &e.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			// A concurrent join won the race; return the winner's row.
			return r.Get(ctx, cohortID, userID)
		}
		return nil, fmt.Errorf("waitlist join: %w", err)
	}
	return e, nil
}

func (r *WaitlistRepo) Get(ctx context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	var e waitlist.Entry
	var notifiedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, cohort_id, user_id, position, notified_at, created_at
		FROM cohort_waitlist WHERE cohort_id=$1 AND user_id=$2`, cohortID, userID).
		Scan(&e.ID, &e.CohortID, &e.UserID, &e.Position, &notifiedAt, &e.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("waitlist get: %w", err)
	}
	if notifiedAt.Valid {
		t := notifiedAt.Time
		e.NotifiedAt = &t
	}
	return &e, nil
}

func (r *WaitlistRepo) ListForCohort(ctx context.Context, cohortID uuid.UUID) ([]waitlist.Entry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, cohort_id, user_id, position, notified_at, created_at
		FROM cohort_waitlist WHERE cohort_id=$1 ORDER BY position`, cohortID)
	if err != nil {
		return nil, fmt.Errorf("waitlist list: %w", err)
	}
	defer rows.Close()
	out := []waitlist.Entry{}
	for rows.Next() {
		var e waitlist.Entry
		var notifiedAt sql.NullTime
		if err := rows.Scan(&e.ID, &e.CohortID, &e.UserID, &e.Position, &notifiedAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		if notifiedAt.Valid {
			t := notifiedAt.Time
			e.NotifiedAt = &t
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *WaitlistRepo) Count(ctx context.Context, cohortID uuid.UUID) (int, error) {
	var n int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM cohort_waitlist WHERE cohort_id=$1`, cohortID).Scan(&n); err != nil {
		return 0, fmt.Errorf("waitlist count: %w", err)
	}
	return n, nil
}

func (r *WaitlistRepo) Leave(ctx context.Context, cohortID, userID uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx,
		`DELETE FROM cohort_waitlist WHERE cohort_id=$1 AND user_id=$2`, cohortID, userID); err != nil {
		return fmt.Errorf("waitlist leave: %w", err)
	}
	return nil
}

func (r *WaitlistRepo) FrontUnnotified(ctx context.Context, cohortID uuid.UUID, limit int) ([]waitlist.Entry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, cohort_id, user_id, position, notified_at, created_at
		FROM cohort_waitlist WHERE cohort_id=$1 AND notified_at IS NULL ORDER BY position`, cohortID)
	if err != nil {
		return nil, fmt.Errorf("waitlist front: %w", err)
	}
	defer rows.Close()
	out := []waitlist.Entry{}
	for rows.Next() {
		var e waitlist.Entry
		var notifiedAt sql.NullTime
		if err := rows.Scan(&e.ID, &e.CohortID, &e.UserID, &e.Position, &notifiedAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (r *WaitlistRepo) MarkNotified(ctx context.Context, id uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx,
		`UPDATE cohort_waitlist SET notified_at = NOW() WHERE id=$1 AND notified_at IS NULL`, id); err != nil {
		return fmt.Errorf("waitlist mark notified: %w", err)
	}
	return nil
}

var _ waitlist.Repository = (*WaitlistRepo)(nil)
