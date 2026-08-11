package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
)

type ProgrammeRepo struct{ db TxQuerier }

func NewProgrammeRepo(db TxQuerier) *ProgrammeRepo { return &ProgrammeRepo{db: db} }

var programmeSortWhitelist = map[string]string{
	"newest": "p.created_at DESC",
	"price":  "p.price_min ASC",
	"-price": "p.price_max DESC",
	"title":  "p.title ASC",
	"-title": "p.title DESC",
}

const programmeColumns = `p.id, p.title, p.slug, p.summary, p.description,
	p.curriculum_id, p.level_id, p.exam_id, p.format, p.status,
	p.price_min, p.price_max, p.currency, p.is_featured,
	p.seo_title, p.seo_description, p.cover_image_key, p.created_at, p.updated_at`

func scanProgramme(row interface{ Scan(...any) error }) (*academics.Programme, error) {
	var pr academics.Programme
	var summary, description, seoTitle, seoDesc, cover sql.NullString
	var curriculumID, levelID, examID uuidNull
	var priceMin, priceMax sql.NullFloat64
	if err := row.Scan(
		&pr.ID, &pr.Title, &pr.Slug, &summary, &description,
		&curriculumID, &levelID, &examID, &pr.Format, &pr.Status,
		&priceMin, &priceMax, &pr.Currency, &pr.IsFeatured,
		&seoTitle, &seoDesc, &cover, &pr.CreatedAt, &pr.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if summary.Valid {
		pr.Summary = &summary.String
	}
	if description.Valid {
		pr.Description = &description.String
	}
	if seoTitle.Valid {
		pr.SeoTitle = &seoTitle.String
	}
	if seoDescription := seoDesc; seoDescription.Valid {
		pr.SeoDescription = &seoDescription.String
	}
	if cover.Valid {
		pr.CoverImageKey = &cover.String
	}
	if curriculumID.Valid {
		pr.CurriculumID = &curriculumID.UUID
	}
	if levelID.Valid {
		pr.LevelID = &levelID.UUID
	}
	if examID.Valid {
		pr.ExamID = &examID.UUID
	}
	if priceMin.Valid {
		pr.PriceMin = &priceMin.Float64
	}
	if priceMax.Valid {
		pr.PriceMax = &priceMax.Float64
	}
	return &pr, nil
}

func (r *ProgrammeRepo) List(ctx context.Context, p academics.ProgrammeListParams) ([]academics.Programme, int64, error) {
	var conds []string
	var args []any

	conds = append(conds, "p.status = 'PUBLISHED'")

	if p.Search != "" {
		conds = append(conds, fmt.Sprintf("(p.title ILIKE $%d OR p.slug ILIKE $%d OR COALESCE(p.summary,'') ILIKE $%d)", len(args)+1, len(args)+1, len(args)+1))
		args = append(args, "%"+p.Search+"%")
	}
	if p.Curriculum != "" {
		conds = append(conds, fmt.Sprintf("EXISTS (SELECT 1 FROM curricula c WHERE c.id = p.curriculum_id AND c.slug = $%d)", len(args)+1))
		args = append(args, p.Curriculum)
	}
	if p.Exam != "" {
		conds = append(conds, fmt.Sprintf("EXISTS (SELECT 1 FROM exams e WHERE e.id = p.exam_id AND e.slug = $%d)", len(args)+1))
		args = append(args, p.Exam)
	}
	if p.Format != "" {
		conds = append(conds, fmt.Sprintf("p.format = $%d", len(args)+1))
		args = append(args, strings.ToUpper(p.Format))
	}
	if p.Featured != nil {
		conds = append(conds, fmt.Sprintf("p.is_featured = $%d", len(args)+1))
		args = append(args, *p.Featured)
	}

	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM programmes p"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count programmes: %w", err)
	}

	order := programmeSortWhitelist[p.Sort]
	if order == "" {
		order = "p.is_featured DESC, p.created_at DESC"
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
		"SELECT "+programmeColumns+" FROM programmes p"+where+" ORDER BY "+order+
			" LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list programmes: %w", err)
	}
	defer rows.Close()

	out := []academics.Programme{}
	for rows.Next() {
		pr, err := scanProgramme(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *pr)
	}
	return out, total, rows.Err()
}

func (r *ProgrammeRepo) GetBySlug(ctx context.Context, slug string) (*academics.Programme, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+programmeColumns+" FROM programmes p WHERE p.slug = $1 AND p.status = 'PUBLISHED'", slug)
	pr, err := scanProgramme(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return pr, nil
}

var _ academics.ProgrammeRepository = (*ProgrammeRepo)(nil)
