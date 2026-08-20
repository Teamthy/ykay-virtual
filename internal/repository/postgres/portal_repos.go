package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// Portal repos — tutor availability, submissions, admin cohorts, admin lessons.

// --- Tutor availability ---

type AvailabilityRepo struct{ db TxQuerier }

func NewAvailabilityRepo(db TxQuerier) *AvailabilityRepo { return &AvailabilityRepo{db: db} }

func (r *AvailabilityRepo) ListByTutor(ctx context.Context, tutorProfileID uuid.UUID) ([]tutor.Availability, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, day_of_week, start_time, end_time, is_recurring, valid_from, valid_to, created_at
		FROM tutor_availabilities WHERE tutor_profile_id = $1 ORDER BY day_of_week, start_time`, tutorProfileID)
	if err != nil {
		return nil, fmt.Errorf("list availability: %w", err)
	}
	defer rows.Close()
	out := []tutor.Availability{}
	for rows.Next() {
		a, err := scanAvailability(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

func scanAvailability(row interface{ Scan(...any) error }) (*tutor.Availability, error) {
	var a tutor.Availability
	var start, end string
	var validFrom, validTo sql.NullTime
	if err := row.Scan(&a.ID, &a.TutorProfileID, &a.DayOfWeek, &start, &end,
		&a.IsRecurring, &validFrom, &validTo, &a.CreatedAt); err != nil {
		return nil, err
	}
	a.StartTime = start
	a.EndTime = end
	if validFrom.Valid {
		a.ValidFrom = &validFrom.Time
	}
	if validTo.Valid {
		a.ValidTo = &validTo.Time
	}
	return &a, nil
}

func (r *AvailabilityRepo) Upsert(ctx context.Context, a *tutor.Availability) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO tutor_availabilities (tutor_profile_id, day_of_week, start_time, end_time, is_recurring, valid_from, valid_to)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (tutor_profile_id, day_of_week, start_time, end_time)
		DO UPDATE SET is_recurring = EXCLUDED.is_recurring, valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to
		RETURNING id, created_at`,
		a.TutorProfileID, a.DayOfWeek, a.StartTime, a.EndTime, a.IsRecurring, a.ValidFrom, a.ValidTo,
	).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		return fmt.Errorf("upsert availability: %w", err)
	}
	return nil
}

func (r *AvailabilityRepo) Delete(ctx context.Context, id uuid.UUID, tutorProfileID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		"DELETE FROM tutor_availabilities WHERE id = $1 AND tutor_profile_id = $2", id, tutorProfileID)
	if err != nil {
		return fmt.Errorf("delete availability: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *AvailabilityRepo) ListExceptions(ctx context.Context, tutorProfileID uuid.UUID) ([]tutor.AvailabilityException, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, exception_date, is_available, start_time, end_time, reason, created_at
		FROM tutor_availability_exceptions WHERE tutor_profile_id = $1 ORDER BY exception_date DESC`, tutorProfileID)
	if err != nil {
		return nil, fmt.Errorf("list availability exceptions: %w", err)
	}
	defer rows.Close()
	out := []tutor.AvailabilityException{}
	for rows.Next() {
		var e tutor.AvailabilityException
		var start, end, reason sql.NullString
		if err := rows.Scan(&e.ID, &e.TutorProfileID, &e.ExceptionDate, &e.IsAvailable, &start, &end, &reason, &e.CreatedAt); err != nil {
			return nil, err
		}
		if start.Valid {
			e.StartTime = &start.String
		}
		if end.Valid {
			e.EndTime = &end.String
		}
		if reason.Valid {
			e.Reason = &reason.String
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *AvailabilityRepo) UpsertException(ctx context.Context, e *tutor.AvailabilityException) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO tutor_availability_exceptions (tutor_profile_id, exception_date, is_available, start_time, end_time, reason)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
		e.TutorProfileID, e.ExceptionDate, e.IsAvailable, e.StartTime, e.EndTime, e.Reason,
	).Scan(&e.ID, &e.CreatedAt)
	if err != nil {
		return fmt.Errorf("upsert availability exception: %w", err)
	}
	return nil
}

func (r *AvailabilityRepo) DeleteException(ctx context.Context, id uuid.UUID, tutorProfileID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		"DELETE FROM tutor_availability_exceptions WHERE id = $1 AND tutor_profile_id = $2", id, tutorProfileID)
	if err != nil {
		return fmt.Errorf("delete availability exception: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

var _ tutor.AvailabilityRepository = (*AvailabilityRepo)(nil)

// --- Submissions ---

type SubmissionRepo struct{ db TxQuerier }

func NewSubmissionRepo(db TxQuerier) *SubmissionRepo { return &SubmissionRepo{db: db} }

func (r *SubmissionRepo) Upsert(ctx context.Context, s *booking.Submission) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO submissions (assignment_id, student_profile_id, content, file_key, submitted_at)
		VALUES ($1,$2,$3,$4,NOW())
		ON CONFLICT (assignment_id, student_profile_id)
		DO UPDATE SET content = EXCLUDED.content, file_key = EXCLUDED.file_key, submitted_at = NOW()
		RETURNING id, submitted_at`,
		s.AssignmentID, s.StudentProfileID, s.Content, s.FileKey,
	).Scan(&s.ID, &s.SubmittedAt)
	if err != nil {
		return fmt.Errorf("upsert submission: %w", err)
	}
	return nil
}

func (r *SubmissionRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Submission, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, assignment_id, student_profile_id, content, file_key, score, feedback, submitted_at, graded_at
		FROM submissions WHERE student_profile_id = $1 ORDER BY submitted_at DESC LIMIT $2`, studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list submissions: %w", err)
	}
	defer rows.Close()
	out := []booking.Submission{}
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func scanSubmission(row interface{ Scan(...any) error }) (*booking.Submission, error) {
	var s booking.Submission
	var content, fileKey, feedback sql.NullString
	var score sql.NullFloat64
	var gradedAt sql.NullTime
	if err := row.Scan(&s.ID, &s.AssignmentID, &s.StudentProfileID, &content, &fileKey,
		&score, &feedback, &s.SubmittedAt, &gradedAt); err != nil {
		return nil, err
	}
	if content.Valid {
		s.Content = &content.String
	}
	if fileKey.Valid {
		s.FileKey = &fileKey.String
	}
	if feedback.Valid {
		s.Feedback = &feedback.String
	}
	if score.Valid {
		s.Score = &score.Float64
	}
	if gradedAt.Valid {
		s.GradedAt = &gradedAt.Time
	}
	return &s, nil
}

var _ booking.SubmissionRepository = (*SubmissionRepo)(nil)

// --- Admin cohorts ---

func (r *CohortRepo) ListAll(ctx context.Context, params booking.CohortListParams) ([]booking.Cohort, int64, error) {
	where := ""
	args := []any{}
	if params.Status != "" {
		where = " WHERE status = $1"
		args = append(args, params.Status)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cohorts"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count cohorts: %w", err)
	}
	limit := params.PageSize
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (params.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+cohortColumns+" FROM cohorts"+where+" ORDER BY created_at DESC LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list all cohorts: %w", err)
	}
	defer rows.Close()
	out := []booking.Cohort{}
	for rows.Next() {
		c, err := scanCohort(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *c)
	}
	return out, total, rows.Err()
}

func (r *CohortRepo) Create(ctx context.Context, c *booking.Cohort) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO cohorts (programme_id, title, slug, tutor_profile_id, capacity, enrolled_count,
			start_date, end_date, schedule_description, timezone, location_mode, location_id,
			fee, currency, status, meeting_link_template, created_by, code, banner_url)
		VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id, created_at, updated_at`,
		c.ProgrammeID, c.Title, c.Slug, c.TutorProfileID, c.Capacity,
		c.StartDate, c.EndDate, c.ScheduleDesc, c.Timezone, c.LocationMode, c.LocationID,
		c.Fee, c.Currency, c.Status, c.MeetingLinkTemplate, c.CreatedBy, c.Code, c.BannerURL,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: cohort slug already exists", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create cohort: %w", err)
	}
	return nil
}

func (r *CohortRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status booking.CohortStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE cohorts SET status = $1,
			published_at = CASE WHEN $1 = 'PUBLISHED' AND published_at IS NULL THEN NOW() ELSE published_at END,
			updated_at = NOW()
		WHERE id = $2`, status, id)
	if err != nil {
		return fmt.Errorf("update cohort status: %w", err)
	}
	return nil
}

// UpdateTutor (re)assigns the tutor teaching a cohort (admin action). nil
// clears the assignment so the cohort is "awaiting tutor" again.
func (r *CohortRepo) UpdateTutor(ctx context.Context, id uuid.UUID, tutorProfileID *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE cohorts SET tutor_profile_id = $1, updated_at = NOW() WHERE id = $2`,
		tutorProfileID, id)
	if err != nil {
		if isForeignKeyViolation(err) {
			return fmt.Errorf("%w: tutor_profile_id does not reference an existing tutor", domain.ErrInvalidInput)
		}
		return fmt.Errorf("update cohort tutor: %w", err)
	}
	return nil
}

// UpdateBanner stores (or clears) the cohort banner image URL.
func (r *CohortRepo) UpdateBanner(ctx context.Context, id uuid.UUID, bannerURL string) error {
	var val *string
	if strings.TrimSpace(bannerURL) != "" {
		b := strings.TrimSpace(bannerURL)
		val = &b
	}
	if _, err := r.db.ExecContext(ctx,
		`UPDATE cohorts SET banner_url = $1, updated_at = NOW() WHERE id = $2`, val, id); err != nil {
		return fmt.Errorf("update cohort banner: %w", err)
	}
	return nil
}

// RequestJoin opens (or re-opens) a tutor's PENDING join request on a cohort.
// Idempotent per (cohort, tutor): a re-request resets a previously reviewed
// row back to PENDING with the new note.
func (r *CohortRepo) RequestJoin(ctx context.Context, cohortID, tutorProfileID uuid.UUID, note *string) (*booking.CohortJoinRequest, error) {
	var jr booking.CohortJoinRequest
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO cohort_join_requests (cohort_id, tutor_profile_id, status, note)
		VALUES ($1, $2, 'PENDING', $3)
		ON CONFLICT (cohort_id, tutor_profile_id)
		DO UPDATE SET status = 'PENDING', note = EXCLUDED.note,
			reviewed_at = NULL, reviewed_by = NULL, created_at = NOW()
		RETURNING id, cohort_id, tutor_profile_id, status, note, created_at, reviewed_at, reviewed_by`,
		cohortID, tutorProfileID, note,
	).Scan(&jr.ID, &jr.CohortID, &jr.TutorProfileID, &jr.Status, &jr.Note, &jr.CreatedAt, &jr.ReviewedAt, &jr.ReviewedBy)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("%w: cohort or tutor profile does not exist", domain.ErrInvalidInput)
		}
		return nil, fmt.Errorf("request cohort join: %w", err)
	}
	return &jr, nil
}

// ListJoinRequests lists join requests, newest first, optionally filtered by
// status ("" returns all).
func (r *CohortRepo) ListJoinRequests(ctx context.Context, status string) ([]booking.CohortJoinRequest, error) {
	query := `
		SELECT id, cohort_id, tutor_profile_id, status, note, created_at, reviewed_at, reviewed_by
		FROM cohort_join_requests`
	args := []any{}
	if status != "" {
		query += " WHERE status = $1"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list cohort join requests: %w", err)
	}
	defer rows.Close()
	out := []booking.CohortJoinRequest{}
	for rows.Next() {
		var jr booking.CohortJoinRequest
		if err := rows.Scan(&jr.ID, &jr.CohortID, &jr.TutorProfileID, &jr.Status, &jr.Note,
			&jr.CreatedAt, &jr.ReviewedAt, &jr.ReviewedBy); err != nil {
			return nil, fmt.Errorf("scan cohort join request: %w", err)
		}
		out = append(out, jr)
	}
	return out, rows.Err()
}

// ReviewJoin stamps APPROVED/REJECTED plus the reviewer on a join request.
func (r *CohortRepo) ReviewJoin(ctx context.Context, requestID uuid.UUID, status string, reviewedBy uuid.UUID) (*booking.CohortJoinRequest, error) {
	var jr booking.CohortJoinRequest
	err := r.db.QueryRowContext(ctx, `
		UPDATE cohort_join_requests
		SET status = $1, reviewed_at = NOW(), reviewed_by = $2
		WHERE id = $3
		RETURNING id, cohort_id, tutor_profile_id, status, note, created_at, reviewed_at, reviewed_by`,
		status, reviewedBy, requestID,
	).Scan(&jr.ID, &jr.CohortID, &jr.TutorProfileID, &jr.Status, &jr.Note, &jr.CreatedAt, &jr.ReviewedAt, &jr.ReviewedBy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: join request not found", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("review cohort join: %w", err)
	}
	return &jr, nil
}

// ProgrammeRoster aggregates programme + cohorts + tutors + students for the
// admin programme console. Returns domain.ErrNotFound when the slug is unknown.
func (r *CohortRepo) ProgrammeRoster(ctx context.Context, slug string) (map[string]any, error) {
	var (
		progID      uuid.UUID
		title, pfmt string
		summary     *string
		pstatus     string
	)
	err := r.db.QueryRowContext(ctx,
		`SELECT id, title, COALESCE(summary, ''), format::text, status::text FROM programmes WHERE slug = $1`,
		slug,
	).Scan(&progID, &title, &summary, &pfmt, &pstatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: programme not found", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("roster: programme lookup: %w", err)
	}
	if *summary == "" {
		summary = nil
	}

	cohortRows, err := r.db.QueryContext(ctx,
		"SELECT "+cohortColumns+" FROM cohorts WHERE programme_id = $1 ORDER BY created_at DESC", progID)
	if err != nil {
		return nil, fmt.Errorf("roster: list cohorts: %w", err)
	}
	defer cohortRows.Close()
	cohorts := []booking.Cohort{}
	for cohortRows.Next() {
		c, err := scanCohort(cohortRows)
		if err != nil {
			return nil, err
		}
		cohorts = append(cohorts, *c)
	}
	if err := cohortRows.Err(); err != nil {
		return nil, fmt.Errorf("roster: cohort scan: %w", err)
	}

	tutorRows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT tp.id, tp.display_name, tp.slug, tp.status::text, tp.is_public,
			COALESCE(u.email, ''), COALESCE(u.phone, ''),
			COALESCE(tp.years_experience, 0),
			COALESCE((
				SELECT string_agg(s.name, ', ' ORDER BY s.name)
				FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
				WHERE ts.tutor_profile_id = tp.id
			), '')
		FROM tutor_profiles tp
		LEFT JOIN users u ON u.id = tp.user_id
		JOIN cohorts c ON c.tutor_profile_id = tp.id
		WHERE c.programme_id = $1
		ORDER BY tp.display_name`, progID)
	if err != nil {
		return nil, fmt.Errorf("roster: list tutors: %w", err)
	}
	defer tutorRows.Close()
	tutors := []map[string]any{}
	for tutorRows.Next() {
		var (
			id              uuid.UUID
			displayName     string
			tslug           string
			tstatus         string
			isPublic        bool
			email, phone    string
			yearsExperience int
			subjects        string
		)
		if err := tutorRows.Scan(&id, &displayName, &tslug, &tstatus, &isPublic,
			&email, &phone, &yearsExperience, &subjects); err != nil {
			return nil, fmt.Errorf("roster: scan tutor: %w", err)
		}
		row := map[string]any{
			"id": id, "display_name": displayName, "slug": tslug, "status": tstatus,
			"is_public": isPublic, "years_experience": yearsExperience,
		}
		if email != "" {
			row["email"] = email
		}
		if phone != "" {
			row["phone"] = phone
		}
		if subjects != "" {
			row["subjects"] = subjects
		}
		tutors = append(tutors, row)
	}
	if err := tutorRows.Err(); err != nil {
		return nil, fmt.Errorf("roster: tutor scan: %w", err)
	}

	studentRows, err := r.db.QueryContext(ctx, `
		SELECT sp.id, ce.cohort_id, sp.first_name, sp.last_name,
			COALESCE(sp.current_level, ''), ce.status::text,
			COALESCE(sp.school_name, ''), COALESCE(u.email, ''), COALESCE(u.phone, ''),
			COALESCE(to_char(sp.date_of_birth, 'YYYY-MM-DD'), '')
		FROM cohort_enrollments ce
		JOIN student_profiles sp ON sp.id = ce.student_profile_id
		LEFT JOIN users u ON u.id = sp.user_id
		JOIN cohorts c ON c.id = ce.cohort_id
		WHERE c.programme_id = $1
		ORDER BY ce.enrolled_at DESC`, progID)
	if err != nil {
		return nil, fmt.Errorf("roster: list students: %w", err)
	}
	defer studentRows.Close()
	students := []map[string]any{}
	for studentRows.Next() {
		var (
			id, cohortID         uuid.UUID
			first, last          string
			level                string
			estatus              string
			school, email, phone string
			dob                  string
		)
		if err := studentRows.Scan(&id, &cohortID, &first, &last, &level, &estatus,
			&school, &email, &phone, &dob); err != nil {
			return nil, fmt.Errorf("roster: scan student: %w", err)
		}
		row := map[string]any{
			"id": id, "cohort_id": cohortID, "first_name": first, "last_name": last,
			"status": estatus,
		}
		if level != "" {
			row["current_level"] = level
		}
		if school != "" {
			row["school_name"] = school
		}
		if email != "" {
			row["email"] = email
		}
		if phone != "" {
			row["phone"] = phone
		}
		if dob != "" {
			row["date_of_birth"] = dob
		}
		students = append(students, row)
	}
	if err := studentRows.Err(); err != nil {
		return nil, fmt.Errorf("roster: student scan: %w", err)
	}

	return map[string]any{
		"programme": map[string]any{
			"id": progID, "title": title, "slug": slug, "summary": summary,
			"format": pfmt, "status": pstatus,
		},
		"cohorts":       cohorts,
		"tutors":        tutors,
		"students":      students,
		"cohort_count":  len(cohorts),
		"student_count": len(students),
	}, nil
}

var _ booking.CohortAdminRepository = (*CohortRepo)(nil)

// --- Admin lessons ---

func (r *LessonRepo) ListByDate(ctx context.Context, date time.Time) ([]booking.Lesson, error) {
	start := date.UTC()
	end := start.Add(24 * time.Hour)
	rows, err := r.db.QueryContext(ctx, `
		SELECT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at, l.video_url
		FROM lessons l
		WHERE l.start_at >= $1 AND l.start_at < $2 ORDER BY l.start_at ASC`, start, end)
	if err != nil {
		return nil, fmt.Errorf("list lessons by date: %w", err)
	}
	defer rows.Close()
	out := []booking.Lesson{}
	for rows.Next() {
		l, err := scanLessonRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

var _ booking.LessonAdminRepository = (*LessonRepo)(nil)

var _ = errors.Is
