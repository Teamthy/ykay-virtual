package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// AuthTokenRepo — email verification + password reset tokens (000014).

type AuthTokenRepo struct{ db TxQuerier }

func NewAuthTokenRepo(db TxQuerier) *AuthTokenRepo { return &AuthTokenRepo{db: db} }

func (r *AuthTokenRepo) Create(ctx context.Context, t *identity.AuthToken) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
		VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		t.UserID, t.Purpose, t.TokenHash, t.ExpiresAt,
	).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		return fmt.Errorf("create auth token: %w", err)
	}
	return nil
}

func (r *AuthTokenRepo) FindByHash(ctx context.Context, tokenHash string) (*identity.AuthToken, error) {
	var t identity.AuthToken
	var consumedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, purpose, token_hash, expires_at, consumed_at, created_at
		FROM auth_tokens WHERE token_hash = $1`, tokenHash).
		Scan(&t.ID, &t.UserID, &t.Purpose, &t.TokenHash, &t.ExpiresAt, &consumedAt, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if consumedAt.Valid {
		t.ConsumedAt = &consumedAt.Time
	}
	return &t, nil
}

func (r *AuthTokenRepo) Consume(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE auth_tokens SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL", id)
	if err != nil {
		return fmt.Errorf("consume auth token: %w", err)
	}
	return nil
}

func (r *AuthTokenRepo) InvalidateAllForUser(ctx context.Context, userID uuid.UUID, purpose identity.AuthTokenPurpose) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE auth_tokens SET consumed_at = NOW()
		WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`, userID, purpose)
	if err != nil {
		return fmt.Errorf("invalidate auth tokens: %w", err)
	}
	return nil
}

var _ identity.AuthTokenRepository = (*AuthTokenRepo)(nil)

var _ = time.Time{}
