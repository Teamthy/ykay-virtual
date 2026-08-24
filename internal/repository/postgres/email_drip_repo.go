package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// EmailDripRepo — postgres EmailDripRepository (migration 000062).
// The UNIQUE(user_id, sequence, step) constraint makes the send idempotent:
// a duplicate insert surfaces as 23505 → ErrAlreadyExists.
type EmailDripRepo struct{ db TxQuerier }

func NewEmailDripRepo(db TxQuerier) *EmailDripRepo { return &EmailDripRepo{db: db} }

func (r *EmailDripRepo) Create(ctx context.Context, d *identity.EmailDrip) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO email_drips (id, user_id, sequence, step) VALUES ($1, $2, $3, $4)`,
		d.ID, d.UserID, d.Sequence, d.Step)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrAlreadyExists
		}
		return fmt.Errorf("create email drip: %w", err)
	}
	return nil
}

func (r *EmailDripRepo) ExistsStep(ctx context.Context, userID uuid.UUID, sequence string, step int) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx,
		`SELECT 1 FROM email_drips WHERE user_id=$1 AND sequence=$2 AND step=$3 LIMIT 1`,
		userID, sequence, step).Scan(&one)
	if err != nil {
		if isNoRows(err) {
			return false, nil
		}
		return false, fmt.Errorf("email drip exists: %w", err)
	}
	return true, nil
}

var _ identity.EmailDripRepository = (*EmailDripRepo)(nil)
