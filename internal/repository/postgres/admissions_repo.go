package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"

	"github.com/google/uuid"
)

type AdmissionsRepo struct{ db TxQuerier }

func NewAdmissionsRepo(db TxQuerier) *AdmissionsRepo { return &AdmissionsRepo{db: db} }

const admissionsColumns = `id, institution_id, programme_id, cohort_id, parent_user_id,
	student_profile_id, applicant_name, current_level, preferred_term, notes, status,
	reviewed_by, reviewed_at, created_at, updated_at`

func scanApplication(row interface{ Scan(...any) error }) (*admissions.Application, error) {
	var a admissions.Application
	var inst, prog, cohort, reviewedBy uuidNull
	var level, term, notes sql.NullString
	var reviewedAt sql.NullTime
	if err := row.Scan(&a.ID, &inst, &prog, &cohort, &a.ParentUserID, &a.StudentProfileID,
		&a.ApplicantName, &level, &term, &notes, &a.Status, &reviewedBy, &reviewedAt,
		&a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, err
	}
	if inst.Valid {
		a.InstitutionID = &inst.UUID
	}
	if prog.Valid {
		a.ProgrammeID = &prog.UUID
	}
	if cohort.Valid {
		a.CohortID = &cohort.UUID
	}
	if reviewedBy.Valid {
		a.ReviewedBy = &reviewedBy.UUID
	}
	if level.Valid {
		a.CurrentLevel = &level.String
	}
	if term.Valid {
		a.PreferredTerm = &term.String
	}
	if notes.Valid {
		a.Notes = &notes.String
	}
	if reviewedAt.Valid {
		a.ReviewedAt = &reviewedAt.Time
	}
	return &a, nil
}

func (r *AdmissionsRepo) Create(ctx context.Context, a *admissions.Application) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO admissions_applications (institution_id, programme_id, cohort_id, parent_user_id,
			student_profile_id, applicant_name, current_level, preferred_term, notes, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, created_at, updated_at`,
		a.InstitutionID, a.ProgrammeID, a.CohortID, a.ParentUserID, a.StudentProfileID,
		a.ApplicantName, a.CurrentLevel, a.PreferredTerm, a.Notes, a.Status,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create admissions application: %w", err)
	}
	return nil
}

func (r *AdmissionsRepo) GetByID(ctx context.Context, id uuid.UUID) (*admissions.Application, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+admissionsColumns+" FROM admissions_applications WHERE id=$1", id)
	a, err := scanApplication(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AdmissionsRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status admissions.Status, reviewedBy *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE admissions_applications SET status=$1, reviewed_by=$2,
			reviewed_at = CASE WHEN $1 IN ('OFFERED','ACCEPTED','REJECTED') THEN NOW() ELSE reviewed_at END,
			updated_at=NOW()
		WHERE id=$3`, status, reviewedBy, id)
	if err != nil {
		return fmt.Errorf("update admissions status: %w", err)
	}
	return nil
}

func (r *AdmissionsRepo) ListByParent(ctx context.Context, parentUserID uuid.UUID, limit int) ([]admissions.Application, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+admissionsColumns+
		` FROM admissions_applications WHERE parent_user_id=$1 ORDER BY created_at DESC LIMIT $2`, parentUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("list admissions by parent: %w", err)
	}
	defer rows.Close()
	out := []admissions.Application{}
	for rows.Next() {
		a, err := scanApplication(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

func (r *AdmissionsRepo) ListAll(ctx context.Context, status string, page, pageSize int) ([]admissions.Application, int64, error) {
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE status=$1"
		args = append(args, status)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM admissions_applications"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count admissions: %w", err)
	}
	limit := pageSize
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+admissionsColumns+` FROM admissions_applications`+where+
		` ORDER BY created_at DESC LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list all admissions: %w", err)
	}
	defer rows.Close()
	out := []admissions.Application{}
	for rows.Next() {
		a, err := scanApplication(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *a)
	}
	return out, total, rows.Err()
}

var _ admissions.Repository = (*AdmissionsRepo)(nil)
