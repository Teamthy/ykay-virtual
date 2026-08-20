package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/certificate"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type CertificateRepo struct{ db TxQuerier }

func NewCertificateRepo(db TxQuerier) *CertificateRepo { return &CertificateRepo{db: db} }

const certificateColumns = `id, student_profile_id, cohort_id, programme_id, learner_name, title,
	programme_title, credential_number, issued_by, issued_at, created_at`

func scanCertificate(row interface{ Scan(...any) error }) (*certificate.Certificate, error) {
	var c certificate.Certificate
	var cohortID, programmeID uuidNull
	var programmeTitle sql.NullString
	if err := row.Scan(&c.ID, &c.StudentProfileID, &cohortID, &programmeID, &c.LearnerName, &c.Title,
		&programmeTitle, &c.CredentialNumber, &c.IssuedBy, &c.IssuedAt, &c.CreatedAt); err != nil {
		return nil, err
	}
	if cohortID.Valid {
		c.CohortID = &cohortID.UUID
	}
	if programmeID.Valid {
		c.ProgrammeID = &programmeID.UUID
	}
	if programmeTitle.Valid {
		c.ProgrammeTitle = &programmeTitle.String
	}
	return &c, nil
}

func (r *CertificateRepo) Create(ctx context.Context, c *certificate.Certificate) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO certificates (student_profile_id, cohort_id, programme_id, learner_name, title,
			programme_title, credential_number, issued_by, issued_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at`,
		c.StudentProfileID, c.CohortID, c.ProgrammeID, c.LearnerName, c.Title,
		c.ProgrammeTitle, c.CredentialNumber, c.IssuedBy, c.IssuedAt,
	).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: certificate already issued", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create certificate: %w", err)
	}
	return nil
}

func (r *CertificateRepo) GetByID(ctx context.Context, id uuid.UUID) (*certificate.Certificate, error) {
	return r.get(ctx, "id = $1", id)
}

func (r *CertificateRepo) GetByCredential(ctx context.Context, number string) (*certificate.Certificate, error) {
	return r.get(ctx, "credential_number = $1", number)
}

func (r *CertificateRepo) get(ctx context.Context, where string, arg any) (*certificate.Certificate, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+certificateColumns+" FROM certificates WHERE "+where, arg)
	c, err := scanCertificate(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *CertificateRepo) GetForStudentAndCohort(ctx context.Context, studentProfileID, cohortID uuid.UUID) (*certificate.Certificate, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+certificateColumns+
		` FROM certificates WHERE student_profile_id=$1 AND cohort_id=$2`, studentProfileID, cohortID)
	c, err := scanCertificate(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return c, nil
}

func (r *CertificateRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]certificate.Certificate, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+certificateColumns+
		` FROM certificates WHERE student_profile_id=$1 ORDER BY issued_at DESC LIMIT $2`, studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list certificates: %w", err)
	}
	defer rows.Close()
	out := []certificate.Certificate{}
	for rows.Next() {
		c, err := scanCertificate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *CertificateRepo) ListByStudents(ctx context.Context, studentProfileIDs []uuid.UUID, limit int) ([]certificate.Certificate, error) {
	if len(studentProfileIDs) == 0 {
		return []certificate.Certificate{}, nil
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, student_profile_id, cohort_id, programme_id, learner_name, title,
			programme_title, credential_number, issued_by, issued_at, created_at
		FROM (
			SELECT id, student_profile_id, cohort_id, programme_id, learner_name, title,
				programme_title, credential_number, issued_by, issued_at, created_at,
				ROW_NUMBER() OVER (PARTITION BY student_profile_id ORDER BY issued_at DESC) AS rn
			FROM certificates
			WHERE student_profile_id = ANY($1::uuid[])
		) ranked
		WHERE rn <= $2
		ORDER BY issued_at DESC`, pq.Array(studentProfileIDs), limit)
	if err != nil {
		return nil, fmt.Errorf("list certificates by students: %w", err)
	}
	defer rows.Close()
	out := []certificate.Certificate{}
	for rows.Next() {
		c, err := scanCertificate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

var _ certificate.CertificateRepository = (*CertificateRepo)(nil)
