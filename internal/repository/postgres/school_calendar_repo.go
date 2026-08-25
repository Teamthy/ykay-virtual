package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/school"

	"github.com/google/uuid"
)

// SchoolCalendarRepo â€” Postgres academic calendar store (migration 000063).
type SchoolCalendarRepo struct{ db TxQuerier }

func NewSchoolCalendarRepo(db TxQuerier) *SchoolCalendarRepo { return &SchoolCalendarRepo{db: db} }

// nilScopeUUID binds the nil (platform) scope as the same all-zero UUID the
// migration's COALESCE indexes use, so scope matching is index-friendly.
const nilScopeUUID = "00000000-0000-0000-0000-000000000000"

const academicSessionColumns = `id, institution_id, name, starts_on, ends_on, status, created_at, updated_at`
const academicTermColumns = `id, session_id, name, number, starts_on, ends_on,
	enrollment_opens_at, enrollment_closes_at, status, created_at, updated_at`

func scanAcademicSession(row interface{ Scan(...any) error }) (*school.Session, error) {
	var s school.Session
	var inst uuidNull
	if err := row.Scan(&s.ID, &inst, &s.Name, &s.StartsOn, &s.EndsOn, &s.Status,
		&s.CreatedAt, &s.UpdatedAt); err != nil {
		return nil, err
	}
	if inst.Valid {
		s.InstitutionID = &inst.UUID
	}
	return &s, nil
}

func scanAcademicTerm(row interface{ Scan(...any) error }) (*school.Term, error) {
	var t school.Term
	var opensAt, closesAt sql.NullTime
	if err := row.Scan(&t.ID, &t.SessionID, &t.Name, &t.Number, &t.StartsOn, &t.EndsOn,
		&opensAt, &closesAt, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return nil, err
	}
	if opensAt.Valid {
		t.EnrollmentOpensAt = &opensAt.Time
	}
	if closesAt.Valid {
		t.EnrollmentClosesAt = &closesAt.Time
	}
	return &t, nil
}

func (r *SchoolCalendarRepo) CreateSession(ctx context.Context, s *school.Session) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO academic_sessions (institution_id, name, starts_on, ends_on, status)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, created_at, updated_at`,
		s.InstitutionID, s.Name, s.StartsOn, s.EndsOn, s.Status,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create academic session: %w", err)
	}
	return nil
}

func (r *SchoolCalendarRepo) GetSession(ctx context.Context, id uuid.UUID) (*school.Session, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+academicSessionColumns+" FROM academic_sessions WHERE id=$1", id)
	s, err := scanAcademicSession(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SchoolCalendarRepo) UpdateSession(ctx context.Context, s *school.Session) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE academic_sessions SET name=$1, starts_on=$2, ends_on=$3, updated_at=NOW()
		WHERE id=$4`, s.Name, s.StartsOn, s.EndsOn, s.ID)
	if err != nil {
		return fmt.Errorf("update academic session: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *SchoolCalendarRepo) SetSessionStatus(ctx context.Context, id uuid.UUID, status school.SessionStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE academic_sessions SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
	if err != nil {
		// ux_academic_sessions_one_active fires when a second ACTIVE session
		// in the scope slips past the service check under concurrency.
		return fmt.Errorf("set academic session status: %w", err)
	}
	return nil
}

func (r *SchoolCalendarRepo) ListSessions(ctx context.Context, institutionID *uuid.UUID) ([]school.Session, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+academicSessionColumns+` FROM academic_sessions
		WHERE COALESCE(institution_id, '`+nilScopeUUID+`'::uuid) = COALESCE($1, '`+nilScopeUUID+`'::uuid)
		ORDER BY created_at DESC`, institutionID)
	if err != nil {
		return nil, fmt.Errorf("list academic sessions: %w", err)
	}
	defer rows.Close()
	out := []school.Session{}
	for rows.Next() {
		s, err := scanAcademicSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *SchoolCalendarRepo) CurrentSession(ctx context.Context, institutionID *uuid.UUID) (*school.Session, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+academicSessionColumns+` FROM academic_sessions
		WHERE COALESCE(institution_id, '`+nilScopeUUID+`'::uuid) = COALESCE($1, '`+nilScopeUUID+`'::uuid)
		  AND status='ACTIVE'`, institutionID)
	s, err := scanAcademicSession(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SchoolCalendarRepo) SessionsOverlap(ctx context.Context, institutionID *uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM academic_sessions
			WHERE COALESCE(institution_id, '`+nilScopeUUID+`'::uuid) = COALESCE($1, '`+nilScopeUUID+`'::uuid)
			  AND status <> 'CLOSED'
			  AND starts_on <= $3 AND ends_on >= $2
			  AND id <> $4
		)`, institutionID, startsOn, endsOn, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check academic session overlap: %w", err)
	}
	return exists, nil
}

func (r *SchoolCalendarRepo) CreateTerm(ctx context.Context, t *school.Term) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO academic_terms (session_id, name, number, starts_on, ends_on,
			enrollment_opens_at, enrollment_closes_at, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_at, updated_at`,
		t.SessionID, t.Name, t.Number, t.StartsOn, t.EndsOn,
		t.EnrollmentOpensAt, t.EnrollmentClosesAt, t.Status,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create academic term: %w", err)
	}
	return nil
}

func (r *SchoolCalendarRepo) GetTerm(ctx context.Context, id uuid.UUID) (*school.Term, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+academicTermColumns+" FROM academic_terms WHERE id=$1", id)
	t, err := scanAcademicTerm(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func (r *SchoolCalendarRepo) UpdateTerm(ctx context.Context, t *school.Term) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE academic_terms SET name=$1, number=$2, starts_on=$3, ends_on=$4,
			enrollment_opens_at=$5, enrollment_closes_at=$6, updated_at=NOW()
		WHERE id=$7`,
		t.Name, t.Number, t.StartsOn, t.EndsOn, t.EnrollmentOpensAt, t.EnrollmentClosesAt, t.ID)
	if err != nil {
		return fmt.Errorf("update academic term: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *SchoolCalendarRepo) SetTermStatus(ctx context.Context, id uuid.UUID, status school.TermStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE academic_terms SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
	if err != nil {
		return fmt.Errorf("set academic term status: %w", err)
	}
	return nil
}

func (r *SchoolCalendarRepo) ListTerms(ctx context.Context, sessionID uuid.UUID) ([]school.Term, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT "+academicTermColumns+
		" FROM academic_terms WHERE session_id=$1 ORDER BY number", sessionID)
	if err != nil {
		return nil, fmt.Errorf("list academic terms: %w", err)
	}
	defer rows.Close()
	out := []school.Term{}
	for rows.Next() {
		t, err := scanAcademicTerm(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *SchoolCalendarRepo) TermsOverlap(ctx context.Context, sessionID uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM academic_terms
			WHERE session_id=$1
			  AND starts_on <= $3 AND ends_on >= $2
			  AND id <> $4
		)`, sessionID, startsOn, endsOn, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check academic term overlap: %w", err)
	}
	return exists, nil
}

func (r *SchoolCalendarRepo) CloseTermsForSession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE academic_terms SET status='CLOSED', updated_at=NOW()
		WHERE session_id=$1 AND status <> 'CLOSED'`, sessionID)
	if err != nil {
		return fmt.Errorf("close terms for session: %w", err)
	}
	return nil
}
