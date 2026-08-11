package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"
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
		INSERT INTO testimonials (author_name, author_location, author_role, body, rating, is_featured, consent_given, is_public)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
		t.AuthorName, t.AuthorLocation, t.AuthorRole, t.Body, t.Rating, t.IsFeatured, t.ConsentGiven, t.IsPublic,
	).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		return fmt.Errorf("create testimonial: %w", err)
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
