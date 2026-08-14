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

// SupportRepo — support ticket persistence (000010_content + 000029).
type SupportRepo struct{ db TxQuerier }

func NewSupportRepo(db TxQuerier) *SupportRepo { return &SupportRepo{db: db} }

const supportTicketColumns = `id, user_id, email, subject, message, status,
	category, severity, sla_due_at, resolved_at, created_at, updated_at`

func scanSupportTicket(row interface{ Scan(...any) error }) (*content.SupportTicket, error) {
	var t content.SupportTicket
	var userID uuidNull
	var slaDueAt, resolvedAt sql.NullTime
	err := row.Scan(&t.ID, &userID, &t.Email, &t.Subject, &t.Message, &t.Status,
		&t.Category, &t.Severity, &slaDueAt, &resolvedAt, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if userID.Valid {
		t.UserID = &userID.UUID
	}
	if slaDueAt.Valid {
		t.SLADueAt = &slaDueAt.Time
	}
	if resolvedAt.Valid {
		t.ResolvedAt = &resolvedAt.Time
	}
	return &t, nil
}

func (r *SupportRepo) Create(ctx context.Context, t *content.SupportTicket) error {
	if t.Category == "" {
		t.Category = string(content.CategoryGeneral)
	}
	if t.Severity == "" {
		t.Severity = "LOW"
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO support_tickets (user_id, email, subject, message, status, category, severity, sla_due_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at, updated_at`,
		t.UserID, t.Email, t.Subject, t.Message, t.Status, t.Category, t.Severity, t.SLADueAt,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create support ticket: %w", err)
	}
	return nil
}

func (r *SupportRepo) GetByID(ctx context.Context, id uuid.UUID) (*content.SupportTicket, error) {
	t, err := scanSupportTicket(r.db.QueryRowContext(ctx,
		"SELECT "+supportTicketColumns+" FROM support_tickets WHERE id = $1", id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func (r *SupportRepo) SetStatus(ctx context.Context, id uuid.UUID, status string) error {
	// resolved_at is stamped when a ticket reaches a terminal state (SLA
	// reporting for the safeguarding queue) and cleared when it reopens.
	terminal := status == "RESOLVED" || status == "CLOSED"
	_, err := r.db.ExecContext(ctx, `
		UPDATE support_tickets
		SET status = $1,
		    resolved_at = CASE WHEN $2::boolean THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $3`, status, terminal, id)
	if err != nil {
		return fmt.Errorf("update support ticket: %w", err)
	}
	return nil
}

func (r *SupportRepo) List(ctx context.Context, status string, page, pageSize int) ([]content.SupportTicket, int64, error) {
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE status = $1"
		args = append(args, status)
	}
	return r.list(ctx, where, args, page, pageSize)
}

// ListByCategory — safeguarding/other triage queues (G5.2).
func (r *SupportRepo) ListByCategory(ctx context.Context, category string, page, pageSize int) ([]content.SupportTicket, int64, error) {
	return r.list(ctx, " WHERE category = $1", []any{category}, page, pageSize)
}

func (r *SupportRepo) list(ctx context.Context, where string, args []any, page, pageSize int) ([]content.SupportTicket, int64, error) {
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM support_tickets"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count support tickets: %w", err)
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+supportTicketColumns+" FROM support_tickets"+where+
			" ORDER BY created_at DESC LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, pageSize, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list support tickets: %w", err)
	}
	defer rows.Close()
	out := []content.SupportTicket{}
	for rows.Next() {
		t, err := scanSupportTicket(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *t)
	}
	return out, total, rows.Err()
}

var _ content.SupportTicketRepository = (*SupportRepo)(nil)
