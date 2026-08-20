package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/leads"

	"github.com/google/uuid"
)

// LeadsRepo — conversion follow-up store (migration 000054_leads).
type LeadsRepo struct{ db TxQuerier }

func NewLeadsRepo(db TxQuerier) *LeadsRepo { return &LeadsRepo{db: db} }

const leadColumns = `id, name, email, phone, source, intent, programme_id, cohort_id, user_id,
	message, status, contacted_at, converted_at, created_at, updated_at`

func scanLead(row interface{ Scan(...any) error }) (*leads.Lead, error) {
	var l leads.Lead
	var name, email, phone, source, intent, message, status string
	var programmeID, cohortID, userID uuidNull
	var contactedAt, convertedAt sql.NullTime
	if err := row.Scan(&l.ID, &name, &email, &phone, &source, &intent, &programmeID, &cohortID, &userID,
		&message, &status, &contactedAt, &convertedAt, &l.CreatedAt, &l.UpdatedAt); err != nil {
		return nil, err
	}
	l.Name = name
	if email != "" {
		l.Email = &email
	}
	if phone != "" {
		l.Phone = &phone
	}
	l.Source = source
	l.Intent = intent
	if message != "" {
		l.Message = &message
	}
	l.Status = status
	if programmeID.Valid {
		l.ProgrammeID = &programmeID.UUID
	}
	if cohortID.Valid {
		l.CohortID = &cohortID.UUID
	}
	if userID.Valid {
		l.UserID = &userID.UUID
	}
	if contactedAt.Valid {
		l.ContactedAt = &contactedAt.Time
	}
	if convertedAt.Valid {
		l.ConvertedAt = &convertedAt.Time
	}
	return &l, nil
}

func (r *LeadsRepo) Create(ctx context.Context, l *leads.Lead) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO leads (name, email, phone, source, intent, programme_id, cohort_id, user_id, message)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at, updated_at`,
		l.Name, l.Email, l.Phone, l.Source, l.Intent, l.ProgrammeID, l.CohortID, l.UserID, l.Message,
	).Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create lead: %w", err)
	}
	return nil
}

func (r *LeadsRepo) GetByID(ctx context.Context, id uuid.UUID) (*leads.Lead, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+leadColumns+" FROM leads WHERE id = $1", id)
	l, err := scanLead(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: lead not found", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("get lead: %w", err)
	}
	return l, nil
}

func (r *LeadsRepo) List(ctx context.Context, status string, page, pageSize int) ([]leads.Lead, int64, error) {
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE status = $1"
		args = append(args, status)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM leads"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count leads: %w", err)
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+leadColumns+" FROM leads"+where+
			" ORDER BY created_at DESC LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, pageSize, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list leads: %w", err)
	}
	defer rows.Close()
	out := []leads.Lead{}
	for rows.Next() {
		l, err := scanLead(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *l)
	}
	return out, total, rows.Err()
}

func (r *LeadsRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, at time.Time) error {
	var contactedAt, convertedAt any
	switch status {
	case leads.StatusContacted:
		contactedAt = at
	case leads.StatusConverted:
		convertedAt = at
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE leads SET status = $1,
			contacted_at = COALESCE($2, contacted_at),
			converted_at = COALESCE($3, converted_at),
			updated_at = NOW()
		WHERE id = $4`, status, contactedAt, convertedAt, id)
	if err != nil {
		return fmt.Errorf("update lead status: %w", err)
	}
	return nil
}

func (r *LeadsRepo) FindRecentOpen(ctx context.Context, intent, source string, userID, cohortID *uuid.UUID, email, phone *string, since time.Time) (*leads.Lead, error) {
	query := `SELECT ` + leadColumns + ` FROM leads
		WHERE status = 'NEW' AND intent = $1 AND created_at >= $2
		AND (user_id = $3 OR ($3 IS NULL AND user_id IS NULL))
		AND (cohort_id = $4 OR ($4 IS NULL AND cohort_id IS NULL))
		AND source = $5
		AND (
			($6 IS NOT NULL AND email = $6)
			OR ($7 IS NOT NULL AND phone = $7)
			OR ($6 IS NULL AND $7 IS NULL)
		)
		ORDER BY created_at DESC LIMIT 1`
	row := r.db.QueryRowContext(ctx, query, intent, since, userID, cohortID, source, email, phone)
	l, err := scanLead(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("find recent lead: %w", err)
	}
	return l, nil
}

func (r *LeadsRepo) CountByStatus(ctx context.Context, status string) (int64, error) {
	var n int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM leads WHERE status = $1", status).Scan(&n); err != nil {
		return 0, fmt.Errorf("count leads by status: %w", err)
	}
	return n, nil
}

var _ leads.Repository = (*LeadsRepo)(nil)
