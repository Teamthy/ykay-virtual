package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/plusteams"
)

// PlusTeamsRepo — postgres implementation of plusteams.Repository (000069).
type PlusTeamsRepo struct{ db TxQuerier }

func NewPlusTeamsRepo(db TxQuerier) *PlusTeamsRepo { return &PlusTeamsRepo{db: db} }

func (r *PlusTeamsRepo) GetAllocation(ctx context.Context, institutionID uuid.UUID) (*plusteams.Allocation, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT institution_id, total_seats, used_seats, created_at, updated_at
		FROM institution_plus WHERE institution_id = $1`, institutionID)
	a := plusteams.Allocation{}
	if err := row.Scan(&a.InstitutionID, &a.TotalSeats, &a.UsedSeats, &a.CreatedAt, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (r *PlusTeamsRepo) SetSeats(ctx context.Context, institutionID uuid.UUID, totalSeats int) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO institution_plus (institution_id, total_seats, used_seats)
		VALUES ($1, $2, 0)
		ON CONFLICT (institution_id) DO UPDATE SET
			total_seats = EXCLUDED.total_seats, updated_at = NOW()
		WHERE institution_plus.used_seats <= EXCLUDED.total_seats`,
		institutionID, totalSeats)
	if err != nil {
		return fmt.Errorf("set plus teams seats: %w", err)
	}
	return nil
}

func (r *PlusTeamsRepo) AssignSeat(ctx context.Context, institutionID, userID uuid.UUID) (*plusteams.Seat, error) {
	// Ensure the allocation exists; only allow if capacity remains.
	if err := r.ensureAllocation(ctx, institutionID); err != nil {
		return nil, err
	}
	// Atomic capacity check + insert.
	var seat plusteams.Seat
	err := r.db.QueryRowContext(ctx, `
		WITH alloc AS (
			SELECT institution_id FROM institution_plus
			WHERE institution_id = $1 AND used_seats < total_seats
			FOR UPDATE
		)
		INSERT INTO institution_plus_seats (institution_id, user_id)
		SELECT institution_id, $2 FROM alloc
		RETURNING id, institution_id, user_id, created_at`,
		institutionID, userID).Scan(&seat.ID, &seat.InstitutionID, &seat.UserID, &seat.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: no seat available (or already assigned)", domain.ErrConflict)
		}
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("%w: user already holds a seat", domain.ErrAlreadyExists)
		}
		return nil, fmt.Errorf("assign plus teams seat: %w", err)
	}
	if _, err := r.db.ExecContext(ctx,
		`UPDATE institution_plus SET used_seats = used_seats + 1, updated_at = NOW() WHERE institution_id = $1`,
		institutionID); err != nil {
		return nil, err
	}
	return &seat, nil
}

func (r *PlusTeamsRepo) ensureAllocation(ctx context.Context, institutionID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO institution_plus (institution_id, total_seats, used_seats)
		VALUES ($1, 0, 0) ON CONFLICT (institution_id) DO NOTHING`, institutionID)
	return err
}

func (r *PlusTeamsRepo) ReleaseSeat(ctx context.Context, institutionID, userID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM institution_plus_seats WHERE institution_id = $1 AND user_id = $2`, institutionID, userID)
	if err != nil {
		return fmt.Errorf("release plus teams seat: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	_, err = r.db.ExecContext(ctx,
		`UPDATE institution_plus SET used_seats = GREATEST(used_seats - 1, 0), updated_at = NOW() WHERE institution_id = $1`,
		institutionID)
	if err != nil {
		return err
	}
	return nil
}

func (r *PlusTeamsRepo) ListSeats(ctx context.Context, institutionID uuid.UUID) ([]plusteams.Seat, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, institution_id, user_id, created_at
		FROM institution_plus_seats WHERE institution_id = $1 ORDER BY created_at ASC`, institutionID)
	if err != nil {
		return nil, fmt.Errorf("list plus teams seats: %w", err)
	}
	defer rows.Close()
	out := []plusteams.Seat{}
	for rows.Next() {
		s := plusteams.Seat{}
		if err := rows.Scan(&s.ID, &s.InstitutionID, &s.UserID, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

var _ plusteams.Repository = (*PlusTeamsRepo)(nil)
