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

// SupportRepo — support ticket persistence (000010_content).

type SupportRepo struct{ db TxQuerier }

func NewSupportRepo(db TxQuerier) *SupportRepo { return &SupportRepo{db: db} }

func (r *SupportRepo) Create(ctx context.Context, t *content.SupportTicket) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO support_tickets (user_id, email, subject, message, status)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`,
		t.UserID, t.Email, t.Subject, t.Message, t.Status,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create support ticket: %w", err)
	}
	return nil
}

func (r *SupportRepo) GetByID(ctx context.Context, id uuid.UUID) (*content.SupportTicket, error) {
	var t content.SupportTicket
	var userID uuidNull
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, email, subject, message, status, created_at, updated_at
		FROM support_tickets WHERE id = $1`, id).
		Scan(&t.ID, &userID, &t.Email, &t.Subject, &t.Message, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if userID.Valid {
		t.UserID = &userID.UUID
	}
	return &t, nil
}

func (r *SupportRepo) SetStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	if err != nil {
		return fmt.Errorf("update support ticket: %w", err)
	}
	return nil
}

var _ content.SupportTicketRepository = (*SupportRepo)(nil)
