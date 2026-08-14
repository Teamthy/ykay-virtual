package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"

	"github.com/google/uuid"
)

// TestimonialRepo — consent-gated public testimonials + admin create.

type TestimonialRepo struct{ db TxQuerier }

func NewTestimonialRepo(db TxQuerier) *TestimonialRepo { return &TestimonialRepo{db: db} }

func (r *TestimonialRepo) ListPublic(ctx context.Context, featuredOnly bool, limit int) ([]content.Testimonial, error) {
	if limit < 1 || limit > 50 {
		limit = 12
	}
	query := `
		SELECT id, author_name, author_location, author_role, body, rating, is_featured, consent_given, is_public, created_at
		FROM testimonials WHERE is_public = TRUE AND consent_given = TRUE`
	args := []any{}
	if featuredOnly {
		query += " AND is_featured = TRUE"
	}
	query += " ORDER BY is_featured DESC, created_at DESC LIMIT $" + fmt.Sprint(len(args)+1)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list testimonials: %w", err)
	}
	defer rows.Close()
	out := []content.Testimonial{}
	for rows.Next() {
		t, err := scanTestimonial(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *TestimonialRepo) Create(ctx context.Context, t *content.Testimonial) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO testimonials (author_name, author_location, author_role, body, rating, is_featured, consent_given, is_public, consent_source, consent_date)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
		t.AuthorName, t.AuthorLocation, t.AuthorRole, t.Body, t.Rating, t.IsFeatured, t.ConsentGiven, t.IsPublic,
		t.ConsentSource, t.ConsentDate,
	).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		return fmt.Errorf("create testimonial: %w", err)
	}
	return nil
}

// GetByID returns one testimonial regardless of publication state (used by
// the admin consent rule, G5.3).
func (r *TestimonialRepo) GetByID(ctx context.Context, id uuid.UUID) (*content.Testimonial, error) {
	var t content.Testimonial
	var location, role, consentSource sql.NullString
	var rating sql.NullInt64
	var consentDate, publishedAt sql.NullTime
	var publishedBy uuidNull
	err := r.db.QueryRowContext(ctx, `
		SELECT id, author_name, author_location, author_role, body, rating,
		       is_featured, consent_given, is_public,
		       consent_source, consent_date, published_at, published_by, created_at
		FROM testimonials WHERE id = $1`, id).
		Scan(&t.ID, &t.AuthorName, &location, &role, &t.Body, &rating,
			&t.IsFeatured, &t.ConsentGiven, &t.IsPublic,
			&consentSource, &consentDate, &publishedAt, &publishedBy, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if location.Valid {
		t.AuthorLocation = &location.String
	}
	if role.Valid {
		t.AuthorRole = &role.String
	}
	if rating.Valid {
		r := int(rating.Int64)
		t.Rating = &r
	}
	if consentSource.Valid {
		t.ConsentSource = &consentSource.String
	}
	if consentDate.Valid {
		t.ConsentDate = &consentDate.Time
	}
	if publishedAt.Valid {
		t.PublishedAt = &publishedAt.Time
	}
	if publishedBy.Valid {
		t.PublishedBy = &publishedBy.UUID
	}
	return &t, nil
}

// SetPublic — publication sign-off (G5.3). Approving stamps published_at +
// published_by; withdrawing clears them.
func (r *TestimonialRepo) SetPublic(ctx context.Context, id uuid.UUID, isPublic bool, publishedBy *uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE testimonials
		SET is_public = $2,
		    published_at = CASE WHEN $2 THEN COALESCE(published_at, NOW()) ELSE NULL END,
		    published_by = CASE WHEN $2 THEN COALESCE(published_by, $3) ELSE NULL END
		WHERE id = $1`, id, isPublic, publishedBy)
	if err != nil {
		return fmt.Errorf("set testimonial public: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func scanTestimonial(row interface{ Scan(...any) error }) (*content.Testimonial, error) {
	var t content.Testimonial
	var location, role sql.NullString
	var rating sql.NullInt64
	if err := row.Scan(&t.ID, &t.AuthorName, &location, &role, &t.Body, &rating,
		&t.IsFeatured, &t.ConsentGiven, &t.IsPublic, &t.CreatedAt); err != nil {
		return nil, err
	}
	if location.Valid {
		t.AuthorLocation = &location.String
	}
	if role.Valid {
		t.AuthorRole = &role.String
	}
	if rating.Valid {
		r := int(rating.Int64)
		t.Rating = &r
	}
	return &t, nil
}

var _ content.TestimonialRepository = (*TestimonialRepo)(nil)
var _ = errors.Is
var _ = domain.ErrNotFound
