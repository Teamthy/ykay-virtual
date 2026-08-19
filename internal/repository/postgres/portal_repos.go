package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
			fee, currency, status, meeting_link_template, created_by)
		VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id, created_at, updated_at`,
		c.ProgrammeID, c.Title, c.Slug, c.TutorProfileID, c.Capacity,
		c.StartDate, c.EndDate, c.ScheduleDesc, c.Timezone, c.LocationMode, c.LocationID,
		c.Fee, c.Currency, c.Status, c.MeetingLinkTemplate, c.CreatedBy,
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
