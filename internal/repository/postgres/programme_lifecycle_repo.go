package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
)

// ProgrammeLifecycleRepo — publish-workflow surface (G5.3). Reads/writes
// only the workflow columns so the catalogue scans stay untouched.

type ProgrammeLifecycleRepo struct{ db TxQuerier }

func NewProgrammeLifecycleRepo(db TxQuerier) *ProgrammeLifecycleRepo {
	return &ProgrammeLifecycleRepo{db: db}
}

func (r *ProgrammeLifecycleRepo) GetLifecycle(ctx context.Context, id uuid.UUID) (*academics.ProgrammeLifecycle, error) {
	var l academics.ProgrammeLifecycle
	var publishedAt, reviewDueAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, status, published_at, review_due_at
		FROM programmes WHERE id = $1`, id).
		Scan(&l.ID, &l.Status, &publishedAt, &reviewDueAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if publishedAt.Valid {
		l.PublishedAt = &publishedAt.Time
	}
	if reviewDueAt.Valid {
		l.ReviewDueAt = &reviewDueAt.Time
	}
	return &l, nil
}

func (r *ProgrammeLifecycleRepo) SetLifecycle(ctx context.Context, l academics.ProgrammeLifecycle) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE programmes
		SET status = $2, published_at = $3, review_due_at = $4, updated_at = NOW()
		WHERE id = $1`,
		l.ID, l.Status, l.PublishedAt, l.ReviewDueAt)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

var _ = time.Now
