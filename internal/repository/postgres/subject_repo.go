package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"

	"github.com/google/uuid"
)

type SubjectRepo struct{ db TxQuerier }

func NewSubjectRepo(db TxQuerier) *SubjectRepo { return &SubjectRepo{db: db} }

var subjectSortWhitelist = map[string]string{
	"name":        "name ASC",
	"-name":       "name DESC",
	"created_at":  "created_at ASC",
	"-created_at": "created_at DESC",
}

const subjectColumns = `id, name, slug, category, description, is_active, created_at, updated_at`

func scanSubject(row interface{ Scan(...any) error }) (*academics.Subject, error) {
	var s academics.Subject
	var desc sql.NullString
	if err := row.Scan(&s.ID, &s.Name, &s.Slug, &s.Category, &desc, &s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
		return nil, err
	}
	if desc.Valid {
		s.Description = &desc.String
	}
	return &s, nil
}

func (r *SubjectRepo) List(ctx context.Context, p academics.SubjectListParams) ([]academics.Subject, int64, error) {
	var conds []string
	var args []any

	if p.Search != "" {
		conds = append(conds, fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+p.Search+"%")
	}
	if p.Category != "" {
		conds = append(conds, fmt.Sprintf("category = $%d", len(args)+1))
		args = append(args, p.Category)
	}
	conds = append(conds, "is_active = TRUE")

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM subjects"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count subjects: %w", err)
	}

	order := subjectSortWhitelist[p.Sort]
	if order == "" {
		order = "name ASC"
	}
	limit := p.PageSize
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (p.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	rows, err := r.db.QueryContext(ctx,
		"SELECT "+subjectColumns+" FROM subjects"+where+" ORDER BY "+order+" LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list subjects: %w", err)
	}
	defer rows.Close()

	out := []academics.Subject{}
	for rows.Next() {
		s, err := scanSubject(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *s)
	}
	return out, total, rows.Err()
}

func (r *SubjectRepo) GetBySlug(ctx context.Context, slug string) (*academics.Subject, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+subjectColumns+" FROM subjects WHERE slug = $1 AND is_active = TRUE", slug)
	s, err := scanSubject(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

var _ academics.SubjectRepository = (*SubjectRepo)(nil)

func (r *SubjectRepo) GetByID(ctx context.Context, id uuid.UUID) (*academics.Subject, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+subjectColumns+" FROM subjects WHERE id = $1", id)
	s, err := scanSubject(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}
