package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"
)

// Enriched programme queries — display names, subjects, next cohort start,
// and per-programme cohorts/tutors for the detail page tabs.

// ListWithMeta — paginated programmes with curriculum/level/exam names,
// subject names and the next published cohort start date.
func (r *ProgrammeRepo) ListWithMeta(ctx context.Context, p academics.ProgrammeListParams) ([]academics.ProgrammeDetail, int64, error) {
	var conds []string
	var args []any
	conds = append(conds, "p.status = 'PUBLISHED'")

	if p.Search != "" {
		conds = append(conds, fmt.Sprintf("(p.title ILIKE $%d OR p.slug ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+p.Search+"%")
	}
	if p.SubjectSlug != "" {
		conds = append(conds, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM programme_subjects ps JOIN subjects s ON s.id = ps.subject_id
			WHERE ps.programme_id = p.id AND s.slug = $%d)`, len(args)+1))
		args = append(args, p.SubjectSlug)
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
	if p.Level != "" {
		conds = append(conds, fmt.Sprintf("EXISTS (SELECT 1 FROM levels l WHERE l.id = p.level_id AND l.slug = $%d)", len(args)+1))
		args = append(args, p.Level)
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

	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.title, p.slug, p.summary, p.description,
			p.curriculum_id, p.level_id, p.exam_id, p.format, p.status,
			p.price_min, p.price_max, p.currency, p.is_featured,
			p.seo_title, p.seo_description, p.cover_image_key, p.created_at, p.updated_at,
			cu.name AS curriculum_name, lv.name AS level_name, ex.name AS exam_name,
			(SELECT MIN(c.start_date)::text FROM cohorts c
			  WHERE c.programme_id = p.id AND c.status = 'PUBLISHED' AND c.start_date >= CURRENT_DATE) AS next_start,
			(SELECT string_agg(s.name, ', ' ORDER BY s.name) FROM programme_subjects ps
			  JOIN subjects s ON s.id = ps.subject_id WHERE ps.programme_id = p.id) AS subject_names,
			(SELECT string_agg(s.slug, ',' ORDER BY s.name) FROM programme_subjects ps
			  JOIN subjects s ON s.id = ps.subject_id WHERE ps.programme_id = p.id) AS subject_slugs
		FROM programmes p
		LEFT JOIN curricula cu ON cu.id = p.curriculum_id
		LEFT JOIN levels lv ON lv.id = p.level_id
		LEFT JOIN exams ex ON ex.id = p.exam_id
		`+where+` ORDER BY `+order+`
		LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list programmes with meta: %w", err)
	}
	defer rows.Close()

	out := []academics.ProgrammeDetail{}
	for rows.Next() {
		var d academics.ProgrammeDetail
		var pr academics.Programme
		var summary, description, seoTitle, seoDesc, cover sql.NullString
		var curriculumID, levelID, examID uuidNull
		var priceMin, priceMax sql.NullFloat64
		var curriculumName, levelName, examName, nextStart, subjectNames, subjectSlugs sql.NullString
		if err := rows.Scan(
			&pr.ID, &pr.Title, &pr.Slug, &summary, &description,
			&curriculumID, &levelID, &examID, &pr.Format, &pr.Status,
			&priceMin, &priceMax, &pr.Currency, &pr.IsFeatured,
			&seoTitle, &seoDesc, &cover, &pr.CreatedAt, &pr.UpdatedAt,
			&curriculumName, &levelName, &examName, &nextStart, &subjectNames, &subjectSlugs,
		); err != nil {
			return nil, 0, err
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
		if seoDesc.Valid {
			pr.SeoDescription = &seoDesc.String
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
		d.Programme = pr
		if curriculumName.Valid {
			d.CurriculumName = &curriculumName.String
		}
		if levelName.Valid {
			d.LevelName = &levelName.String
		}
		if examName.Valid {
			d.ExamName = &examName.String
		}
		if nextStart.Valid {
			d.NextStart = &nextStart.String
		}
		if subjectNames.Valid {
			d.Subjects = splitList(subjectNames.String)
		}
		if subjectSlugs.Valid {
			d.SubjectSlugs = splitList(subjectSlugs.String)
		}
		out = append(out, d)
	}
	return out, total, rows.Err()
}

// GetDetailBySlug — single enriched programme.
func (r *ProgrammeRepo) GetDetailBySlug(ctx context.Context, slug string) (*academics.ProgrammeDetail, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT p.id, p.title, p.slug, p.summary, p.description,
			p.curriculum_id, p.level_id, p.exam_id, p.format, p.status,
			p.price_min, p.price_max, p.currency, p.is_featured,
			p.seo_title, p.seo_description, p.cover_image_key, p.created_at, p.updated_at,
			cu.name AS curriculum_name, lv.name AS level_name, ex.name AS exam_name,
			(SELECT MIN(c.start_date)::text FROM cohorts c
			  WHERE c.programme_id = p.id AND c.status = 'PUBLISHED' AND c.start_date >= CURRENT_DATE) AS next_start,
			(SELECT string_agg(s.name, ', ' ORDER BY s.name) FROM programme_subjects ps
			  JOIN subjects s ON s.id = ps.subject_id WHERE ps.programme_id = p.id) AS subject_names,
			(SELECT string_agg(s.slug, ',' ORDER BY s.name) FROM programme_subjects ps
			  JOIN subjects s ON s.id = ps.subject_id WHERE ps.programme_id = p.id) AS subject_slugs
		FROM programmes p
		LEFT JOIN curricula cu ON cu.id = p.curriculum_id
		LEFT JOIN levels lv ON lv.id = p.level_id
		LEFT JOIN exams ex ON ex.id = p.exam_id
		WHERE p.slug = $1 AND p.status = 'PUBLISHED'`, slug)

	var d academics.ProgrammeDetail
	var pr academics.Programme
	var summary, description, seoTitle, seoDesc, cover sql.NullString
	var curriculumID, levelID, examID uuidNull
	var priceMin, priceMax sql.NullFloat64
	var curriculumName, levelName, examName, nextStart, subjectNames, subjectSlugs sql.NullString
	err := row.Scan(
		&pr.ID, &pr.Title, &pr.Slug, &summary, &description,
		&curriculumID, &levelID, &examID, &pr.Format, &pr.Status,
		&priceMin, &priceMax, &pr.Currency, &pr.IsFeatured,
		&seoTitle, &seoDesc, &cover, &pr.CreatedAt, &pr.UpdatedAt,
		&curriculumName, &levelName, &examName, &nextStart, &subjectNames, &subjectSlugs,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
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
	if seoDesc.Valid {
		pr.SeoDescription = &seoDesc.String
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
	d.Programme = pr
	if curriculumName.Valid {
		d.CurriculumName = &curriculumName.String
	}
	if levelName.Valid {
		d.LevelName = &levelName.String
	}
	if examName.Valid {
		d.ExamName = &examName.String
	}
	if nextStart.Valid {
		d.NextStart = &nextStart.String
	}
	if subjectNames.Valid {
		d.Subjects = splitList(subjectNames.String)
	}
	if subjectSlugs.Valid {
		d.SubjectSlugs = splitList(subjectSlugs.String)
	}
	return &d, nil
}

// CohortsForProgramme — published cohorts for the detail page Cohorts tab.
func (r *CohortRepo) CohortsForProgramme(ctx context.Context, programmeID uuid.UUID) ([]booking.Cohort, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+cohortColumns+` FROM cohorts
		WHERE programme_id = $1 AND status = 'PUBLISHED' ORDER BY start_date ASC`, programmeID)
	if err != nil {
		return nil, fmt.Errorf("cohorts for programme: %w", err)
	}
	defer rows.Close()
	out := []booking.Cohort{}
	for rows.Next() {
		c, err := scanCohort(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// TutorsForProgrammeSubjects — approved tutors teaching any of the
// programme's subjects (Tutors tab).
func (r *TutorRepo) TutorsForProgrammeSubjects(ctx context.Context, programmeID uuid.UUID, limit int) ([]tutor.TutorSearchResult, error) {
	if limit < 1 || limit > 50 {
		limit = 12
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT `+tutorColumns+`
		FROM tutor_profiles t
		JOIN tutor_subjects ts ON ts.tutor_profile_id = t.id AND ts.is_approved = TRUE
		JOIN programme_subjects ps ON ps.subject_id = ts.subject_id AND ps.programme_id = $1
		WHERE t.status = 'APPROVED' AND t.is_public = TRUE
		ORDER BY t.ranking_score DESC LIMIT $2`, programmeID, limit)
	if err != nil {
		return nil, fmt.Errorf("tutors for programme: %w", err)
	}
	defer rows.Close()
	out := []tutor.TutorSearchResult{}
	for rows.Next() {
		t, err := scanTutorResult(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func splitList(s string) []string {
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
