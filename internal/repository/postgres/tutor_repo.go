package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type TutorRepo struct{ db TxQuerier }

func NewTutorRepo(db TxQuerier) *TutorRepo { return &TutorRepo{db: db} }

var tutorSortWhitelist = map[string]string{
	"ranking_score": "t.ranking_score DESC, t.rating_avg DESC",
	"rating":        "t.rating_avg DESC, t.rating_count DESC",
	"price":         "t.hourly_rate_min ASC",
	"-price":        "t.hourly_rate_max DESC",
	"newest":        "t.created_at DESC",
}

const tutorColumns = `t.id, t.user_id, t.slug, t.display_name, t.headline, t.bio,
	t.years_experience, t.hourly_rate_min, t.hourly_rate_max, t.currency,
	t.status, t.is_public, t.rating_avg, t.rating_count, t.total_hours_taught, t.total_students,
	t.ranking_score, t.timezone, t.location_id, t.accepts_online, t.accepts_in_person,
	t.verified_at, t.created_at, t.updated_at,
	(SELECT COALESCE(l.name, '') FROM locations l WHERE l.id = t.location_id) AS location_label`

func scanTutorResult(row interface{ Scan(...any) error }) (*tutor.TutorSearchResult, error) {
	var t tutor.TutorProfile
	var headline, bio, label sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(
		&t.ID, &t.UserID, &t.Slug, &t.DisplayName, &headline, &bio,
		&t.YearsExperience, &t.HourlyRateMin, &t.HourlyRateMax, &t.Currency,
		&t.Status, &t.IsPublic, &t.RatingAvg, &t.RatingCount, &t.TotalHoursTaught, &t.TotalStudents,
		&t.RankingScore, &t.Timezone, &t.LocationID, &t.AcceptsOnline, &t.AcceptsInPerson,
		&verifiedAt, &t.CreatedAt, &t.UpdatedAt, &label,
	); err != nil {
		return nil, err
	}
	if headline.Valid {
		t.Headline = &headline.String
	}
	if bio.Valid {
		t.Bio = &bio.String
	}
	if verifiedAt.Valid {
		t.VerifiedAt = &verifiedAt.Time
	}
	res := tutor.TutorSearchResult{Profile: t}
	if label.Valid {
		res.LocationLabel = &label.String
	}
	return &res, nil
}

// scanTutor scans a plain profile row. tutorColumns includes the derived
// location_label column, so the 25th destination is scanned and dropped.
func scanTutor(row interface{ Scan(...any) error }) (*tutor.TutorProfile, error) {
	var t tutor.TutorProfile
	var headline, bio, label sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(
		&t.ID, &t.UserID, &t.Slug, &t.DisplayName, &headline, &bio,
		&t.YearsExperience, &t.HourlyRateMin, &t.HourlyRateMax, &t.Currency,
		&t.Status, &t.IsPublic, &t.RatingAvg, &t.RatingCount, &t.TotalHoursTaught, &t.TotalStudents,
		&t.RankingScore, &t.Timezone, &t.LocationID, &t.AcceptsOnline, &t.AcceptsInPerson,
		&verifiedAt, &t.CreatedAt, &t.UpdatedAt, &label,
	); err != nil {
		return nil, err
	}
	if headline.Valid {
		t.Headline = &headline.String
	}
	if bio.Valid {
		t.Bio = &bio.String
	}
	if verifiedAt.Valid {
		t.VerifiedAt = &verifiedAt.Time
	}
	return &t, nil
}

// Search implements marketplace search with whitelisted sort + filter params.
// Only APPROVED + is_public tutors are ever returned (SEO: no draft pages).
func (r *TutorRepo) Search(ctx context.Context, p tutor.TutorSearchParams) ([]tutor.TutorSearchResult, int64, error) {
	var conds []string
	var args []any

	conds = append(conds, "t.status = 'APPROVED'")
	conds = append(conds, "t.is_public = TRUE")

	if p.Query != "" {
		conds = append(conds, fmt.Sprintf(`(t.display_name ILIKE $%d OR COALESCE(t.headline,'') ILIKE $%d OR COALESCE(t.bio,'') ILIKE $%d)`,
			len(args)+1, len(args)+1, len(args)+1))
		args = append(args, "%"+p.Query+"%")
	}

	if p.SubjectSlug != "" {
		// EXISTS against tutor_subjects — no join fan-out, keeps COUNT exact.
		conds = append(conds, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM tutor_subjects ts
			JOIN subjects s ON s.id = ts.subject_id
			WHERE ts.tutor_profile_id = t.id AND s.slug = $%d AND ts.is_approved = TRUE
		)`, len(args)+1))
		args = append(args, p.SubjectSlug)
	}
	if p.Location != "" {
		conds = append(conds, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM locations l WHERE l.id = t.location_id
			AND l.name ILIKE $%d
		)`, len(args)+1))
		args = append(args, "%"+p.Location+"%")
	}
	if p.Online != nil {
		conds = append(conds, fmt.Sprintf("t.accepts_online = $%d", len(args)+1))
		args = append(args, *p.Online)
	}
	if p.InPerson != nil {
		conds = append(conds, fmt.Sprintf("t.accepts_in_person = $%d", len(args)+1))
		args = append(args, *p.InPerson)
	}
	if p.MinPrice != nil {
		conds = append(conds, fmt.Sprintf("t.hourly_rate_min >= $%d", len(args)+1))
		args = append(args, *p.MinPrice)
	}
	if p.MaxPrice != nil {
		conds = append(conds, fmt.Sprintf("t.hourly_rate_min <= $%d", len(args)+1))
		args = append(args, *p.MaxPrice)
	}
	if p.MinRating != nil {
		conds = append(conds, fmt.Sprintf("t.rating_avg >= $%d", len(args)+1))
		args = append(args, *p.MinRating)
	}

	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM tutor_profiles t"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count tutors: %w", err)
	}

	order := tutorSortWhitelist[p.Sort]
	if order == "" {
		order = "t.ranking_score DESC, t.rating_avg DESC"
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
		"SELECT "+tutorColumns+" FROM tutor_profiles t"+where+" ORDER BY "+order+
			" LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("search tutors: %w", err)
	}
	defer rows.Close()

	out := []tutor.TutorSearchResult{}
	ids := []uuid.UUID{}
	for rows.Next() {
		res, err := scanTutorResult(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *res)
		ids = append(ids, res.Profile.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	// Hydrate subjects in one batch query (no join fan-out on the list scan).
	if len(ids) > 0 {
		if err := r.hydrateSubjects(ctx, out, ids); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

// hydrateSubjects — batch-loads subject names/slugs per tutor so search
// cards render "Teaches Mathematics · Physics" (Batch 3).
func (r *TutorRepo) hydrateSubjects(ctx context.Context, out []tutor.TutorSearchResult, ids []uuid.UUID) error {
	subjRows, err := r.db.QueryContext(ctx, `
		SELECT ts.tutor_profile_id, s.name, s.slug
		FROM tutor_subjects ts
		JOIN subjects s ON s.id = ts.subject_id
		WHERE ts.tutor_profile_id = ANY($1::uuid[])
		ORDER BY ts.created_at ASC`, pq.Array(ids))
	if err != nil {
		return fmt.Errorf("hydrate tutor subjects: %w", err)
	}
	defer subjRows.Close()

	byID := make(map[uuid.UUID][]int)
	for i := range out {
		byID[out[i].Profile.ID] = append(byID[out[i].Profile.ID], i)
	}
	for subjRows.Next() {
		var tid uuid.UUID
		var name, slug string
		if err := subjRows.Scan(&tid, &name, &slug); err != nil {
			return err
		}
		for _, i := range byID[tid] {
			out[i].Subjects = append(out[i].Subjects, name)
			out[i].SubjectSlugs = append(out[i].SubjectSlugs, slug)
		}
	}
	return subjRows.Err()
}

func (r *TutorRepo) GetBySlug(ctx context.Context, slug string) (*tutor.TutorProfile, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+tutorColumns+" FROM tutor_profiles t WHERE t.slug = $1 AND t.status = 'APPROVED' AND t.is_public = TRUE", slug)
	t, err := scanTutor(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func (r *TutorRepo) GetByID(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+tutorColumns+" FROM tutor_profiles t WHERE t.id = $1", id)
	t, err := scanTutor(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

var _ tutor.TutorRepository = (*TutorRepo)(nil)
