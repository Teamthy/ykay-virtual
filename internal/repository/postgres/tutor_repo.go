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
	(SELECT COALESCE(l.area, l.city, l.state, '') FROM locations l WHERE l.id = t.location_id) AS location_label`

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

// scanTutor scans a plain profile row (no location_label column).
func scanTutor(row interface{ Scan(...any) error }) (*tutor.TutorProfile, error) {
	var t tutor.TutorProfile
	var headline, bio sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(
		&t.ID, &t.UserID, &t.Slug, &t.DisplayName, &headline, &bio,
		&t.YearsExperience, &t.HourlyRateMin, &t.HourlyRateMax, &t.Currency,
		&t.Status, &t.IsPublic, &t.RatingAvg, &t.RatingCount, &t.TotalHoursTaught, &t.TotalStudents,
		&t.RankingScore, &t.Timezone, &t.LocationID, &t.AcceptsOnline, &t.AcceptsInPerson,
		&verifiedAt, &t.CreatedAt, &t.UpdatedAt,
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
			AND (l.city ILIKE $%d OR l.area ILIKE $%d OR l.state ILIKE $%d)
		)`, len(args)+1, len(args)+1, len(args)+1))
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
	for rows.Next() {
		res, err := scanTutorResult(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *res)
	}
	return out, total, rows.Err()
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
