package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AuthTokenPurpose — what a token is for (migration 000014_auth_tokens).
type AuthTokenPurpose string

const (
	TokenVerifyEmail   AuthTokenPurpose = "VERIFY_EMAIL"
	TokenPasswordReset AuthTokenPurpose = "PASSWORD_RESET"
	TokenLoginCode     AuthTokenPurpose = "LOGIN_CODE"
)

// AuthToken — single-use, expiring, hash-only-stored token for email
// verification and password resets. Raw token lives only in the emailed link.
type AuthToken struct {
	ID         uuid.UUID        `json:"id"`
	UserID     uuid.UUID        `json:"user_id"`
	Purpose    AuthTokenPurpose `json:"purpose"`
	TokenHash  string           `json:"-"`
	ExpiresAt  time.Time        `json:"expires_at"`
	ConsumedAt *time.Time       `json:"consumed_at,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
}

func (t *AuthToken) IsExpired(now time.Time) bool { return now.After(t.ExpiresAt) }
func (t *AuthToken) IsConsumed() bool             { return t.ConsumedAt != nil }

type AuthTokenRepository interface {
	Create(ctx context.Context, t *AuthToken) error
	FindByHash(ctx context.Context, tokenHash string) (*AuthToken, error)
	Consume(ctx context.Context, id uuid.UUID) error
	// InvalidateAllForUser revokes outstanding tokens of a purpose (e.g.
	// after a password change, all outstanding reset tokens die).
	InvalidateAllForUser(ctx context.Context, userID uuid.UUID, purpose AuthTokenPurpose) error
}
