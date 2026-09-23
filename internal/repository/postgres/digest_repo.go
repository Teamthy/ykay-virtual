package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/digest"
)

// DigestRepo — postgres implementation of digest.Repository (migration 000076).
type DigestRepo struct{ db TxQuerier }

func NewDigestRepo(db TxQuerier) *DigestRepo { return &DigestRepo{db: db} }

func (r *DigestRepo) Get(ctx context.Context, parentUserID uuid.UUID) (*digest.Prefs, error) {
	var p digest.Prefs
	var lastSent sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT parent_user_id, enabled, last_sent_at, updated_at
		FROM parent_digest_prefs WHERE parent_user_id = $1`, parentUserID).
		Scan(&p.ParentUserID, &p.Enabled, &lastSent, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, digest.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("digest prefs get: %w", err)
	}
	if lastSent.Valid {
		t := lastSent.Time
		p.LastSentAt = &t
	}
	return &p, nil
}

func (r *DigestRepo) Upsert(ctx context.Context, p *digest.Prefs) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO parent_digest_prefs (parent_user_id, enabled, last_sent_at, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (parent_user_id) DO UPDATE
			SET enabled = EXCLUDED.enabled,
			    last_sent_at = EXCLUDED.last_sent_at,
			    updated_at = NOW()`,
		p.ParentUserID, p.Enabled, p.LastSentAt)
	if err != nil {
		return fmt.Errorf("digest prefs upsert: %w", err)
	}
	return nil
}

func (r *DigestRepo) ListEnabled(ctx context.Context) ([]digest.Prefs, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT parent_user_id, enabled, last_sent_at, updated_at
		FROM parent_digest_prefs WHERE enabled = TRUE`)
	if err != nil {
		return nil, fmt.Errorf("digest prefs list enabled: %w", err)
	}
	defer rows.Close()
	out := []digest.Prefs{}
	for rows.Next() {
		var p digest.Prefs
		var lastSent sql.NullTime
		if err := rows.Scan(&p.ParentUserID, &p.Enabled, &lastSent, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("digest prefs scan: %w", err)
		}
		if lastSent.Valid {
			t := lastSent.Time
			p.LastSentAt = &t
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
