package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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

// CreateProgramme inserts a new programme as DRAFT (admin console).
func (r *ProgrammeLifecycleRepo) CreateProgramme(ctx context.Context, p *academics.Programme) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO programmes (title, slug, summary, description, curriculum_id, level_id,
			exam_id, format, status, price_min, price_max, currency, is_featured, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',$9,$10,$11,$12,$13)
		RETURNING id, created_at, updated_at`,
		p.Title, p.Slug, p.Summary, p.Description, p.CurriculumID, p.LevelID, p.ExamID,
		p.Format, p.PriceMin, p.PriceMax, p.Currency, p.IsFeatured, p.CreatedBy,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: programme slug already exists", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create programme: %w", err)
	}
	return nil
}

// UpdateProgramme saves editable programme fields (admin edit).
func (r *ProgrammeLifecycleRepo) UpdateProgramme(ctx context.Context, p *academics.Programme) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE programmes SET
			title = $1, summary = $2, description = $3, price_min = $4, price_max = $5,
			currency = $6, is_featured = $7, updated_at = NOW()
		WHERE id = $8`,
		p.Title, p.Summary, p.Description, p.PriceMin, p.PriceMax, p.Currency, p.IsFeatured, p.ID)
	if err != nil {
		return fmt.Errorf("update programme: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
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
