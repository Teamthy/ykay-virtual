package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

type CohortRepo struct{ db TxQuerier }

func NewCohortRepo(db TxQuerier) *CohortRepo { return &CohortRepo{db: db} }

const cohortColumns = `id, programme_id, title, slug, tutor_profile_id, capacity, enrolled_count,
	start_date, end_date, schedule_description, timezone, location_mode, location_id,
	fee, currency, status, meeting_link_template, created_by, published_at, created_at, updated_at,
	COALESCE(code, ''), banner_url`

func scanCohort(row interface{ Scan(...any) error }) (*booking.Cohort, error) {
	var c booking.Cohort
	var tutorID, locID, createdBy uuidNull
	var schedule, meetingLink, banner sql.NullString
	var publishedAt sql.NullTime
	if err := row.Scan(
		&c.ID, &c.ProgrammeID, &c.Title, &c.Slug, &tutorID, &c.Capacity, &c.EnrolledCount,
		&c.StartDate, &c.EndDate, &schedule, &c.Timezone, &c.LocationMode, &locID,
		&c.Fee, &c.Currency, &c.Status, &meetingLink, &createdBy, &publishedAt, &c.CreatedAt, &c.UpdatedAt,
		&c.Code, &banner,
	); err != nil {
		return nil, err
	}
	if tutorID.Valid {
		c.TutorProfileID = &tutorID.UUID
	}
	if locID.Valid {
		c.LocationID = &locID.UUID
	}
	if createdBy.Valid {
		c.CreatedBy = &createdBy.UUID
	}
	if schedule.Valid {
		c.ScheduleDesc = &schedule.String
	}
	if meetingLink.Valid {
		c.MeetingLinkTemplate = &meetingLink.String
	}
	if publishedAt.Valid {
		c.PublishedAt = &publishedAt.Time
	}
	if banner.Valid {
		c.BannerURL = &banner.String
	}
	return &c, nil
}

func (r *CohortRepo) GetByID(ctx context.Context, id uuid.UUID) (*booking.Cohort, error) {
	return r.get(ctx, id, "")
}

// ListByTutor — the cohorts a tutor is assigned to, newest first.
func (r *CohortRepo) ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]booking.Cohort, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+cohortColumns+` FROM cohorts
		WHERE tutor_profile_id = $1
		ORDER BY created_at DESC LIMIT $2`, tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list cohorts by tutor: %w", err)
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

func (r *CohortRepo) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*booking.Cohort, error) {
	return r.get(ctx, id, " FOR UPDATE")
}

func (r *CohortRepo) get(ctx context.Context, id uuid.UUID, lock string) (*booking.Cohort, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+cohortColumns+" FROM cohorts WHERE id = $1"+lock, id)
	c, err := scanCohort(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *CohortRepo) IncrementEnrolledCount(ctx context.Context, id uuid.UUID, delta int) error {
	res, err := r.db.ExecContext(ctx,
		"UPDATE cohorts SET enrolled_count = enrolled_count + $1, updated_at = NOW() WHERE id = $2", delta, id)
	if err != nil {
		return fmt.Errorf("increment enrolled count: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

type CohortEnrollmentRepo struct{ db TxQuerier }

func NewCohortEnrollmentRepo(db TxQuerier) *CohortEnrollmentRepo {
	return &CohortEnrollmentRepo{db: db}
}

const enrollmentColumns = `id, cohort_id, student_profile_id, parent_user_id, order_id, status, enrolled_at, cancelled_at, created_at`

func scanEnrollment(row interface{ Scan(...any) error }) (*booking.CohortEnrollment, error) {
	var e booking.CohortEnrollment
	var orderID uuidNull
	var cancelledAt sql.NullTime
	if err := row.Scan(
		&e.ID, &e.CohortID, &e.StudentProfileID, &e.ParentUserID, &orderID,
		&e.Status, &e.EnrolledAt, &cancelledAt, &e.CreatedAt,
	); err != nil {
		return nil, err
	}
	if orderID.Valid {
		e.OrderID = &orderID.UUID
	}
	if cancelledAt.Valid {
		e.CancelledAt = &cancelledAt.Time
	}
	return &e, nil
}

func (r *CohortEnrollmentRepo) Create(ctx context.Context, e *booking.CohortEnrollment) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO cohort_enrollments (cohort_id, student_profile_id, parent_user_id, order_id, status)
		VALUES ($1, $2, $3, $4, $5) RETURNING id, enrolled_at, created_at`,
		e.CohortID, e.StudentProfileID, e.ParentUserID, e.OrderID, e.Status,
	).Scan(&e.ID, &e.EnrolledAt, &e.CreatedAt)
	if err != nil {
		return fmt.Errorf("create enrollment: %w", err)
	}
	return nil
}

func (r *CohortEnrollmentRepo) ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]booking.CohortEnrollment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, cohort_id, student_profile_id, parent_user_id, order_id, status, enrolled_at, cancelled_at, created_at
		FROM cohort_enrollments WHERE cohort_id = $1 ORDER BY enrolled_at DESC`, cohortID)
	if err != nil {
		return nil, fmt.Errorf("list enrollments: %w", err)
	}
	defer rows.Close()
	out := []booking.CohortEnrollment{}
	for rows.Next() {
		var e booking.CohortEnrollment
		var orderID, cancelledAt *uuid.UUID
		var cancelled *time.Time
		if err := rows.Scan(&e.ID, &e.CohortID, &e.StudentProfileID, &e.ParentUserID, &orderID, &e.Status, &e.EnrolledAt, &cancelled, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.OrderID = orderID
		if cancelled != nil {
			e.CancelledAt = cancelled
		}
		_ = cancelledAt
		out = append(out, e)
	}
	return out, rows.Err()
}

// ListByParent — the parent's enrollments, newest first (messaging contacts).
func (r *CohortEnrollmentRepo) ListByParent(ctx context.Context, parentUserID uuid.UUID, limit int) ([]booking.CohortEnrollment, error) {
	if limit < 1 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+enrollmentColumns+` FROM cohort_enrollments
		WHERE parent_user_id = $1
		ORDER BY created_at DESC LIMIT $2`, parentUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("list enrollments by parent: %w", err)
	}
	defer rows.Close()
	out := []booking.CohortEnrollment{}
	for rows.Next() {
		e, err := scanEnrollment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

func (r *CohortEnrollmentRepo) GetByCohortAndStudent(ctx context.Context, cohortID, studentProfileID uuid.UUID) (*booking.CohortEnrollment, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+enrollmentColumns+" FROM cohort_enrollments WHERE cohort_id = $1 AND student_profile_id = $2",
		cohortID, studentProfileID)
	e, err := scanEnrollment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func (r *CohortEnrollmentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status booking.EnrollmentStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE cohort_enrollments SET status = $1, updated_at = NOW(),
			cancelled_at = CASE WHEN $1 = 'CANCELLED' THEN NOW() ELSE cancelled_at END
		WHERE id = $2`, status, id)
	if err != nil {
		return fmt.Errorf("update enrollment status: %w", err)
	}
	return nil
}

// ListStalePending — PENDING enrollments older than cutoff (seat-leak cron).
// SKIP LOCKED keeps a second worker replica from double-processing a row.
func (r *CohortEnrollmentRepo) ListStalePending(ctx context.Context, cutoff time.Time, limit int) ([]booking.CohortEnrollment, error) {
	if limit < 1 || limit > 500 {
		limit = 200
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+enrollmentColumns+` FROM cohort_enrollments
		WHERE status = 'PENDING' AND created_at < $1
		ORDER BY created_at ASC LIMIT $2
		FOR UPDATE SKIP LOCKED`, cutoff, limit)
	if err != nil {
		return nil, fmt.Errorf("list stale pending enrollments: %w", err)
	}
	defer rows.Close()
	out := []booking.CohortEnrollment{}
	for rows.Next() {
		e, err := scanEnrollment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

// Reactivate — revive a CANCELLED enrollment (expired checkout) for a new
// order: back to PENDING with a fresh order and enrolment timestamp.
func (r *CohortEnrollmentRepo) Reactivate(ctx context.Context, id uuid.UUID, orderID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE cohort_enrollments
		SET status = 'PENDING', order_id = $1, cancelled_at = NULL,
			enrolled_at = NOW(), updated_at = NOW()
		WHERE id = $2`, orderID, id)
	if err != nil {
		return fmt.Errorf("reactivate enrollment: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

type PrivateTuitionRequestRepo struct{ db TxQuerier }

func NewPrivateTuitionRequestRepo(db TxQuerier) *PrivateTuitionRequestRepo {
	return &PrivateTuitionRequestRepo{db: db}
}

func (r *PrivateTuitionRequestRepo) Create(ctx context.Context, req *booking.PrivateTuitionRequest) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO private_tuition_requests
			(parent_user_id, student_profile_id, subject_id, curriculum_id, level_id,
			 goals, preferred_days, preferred_time_range, timezone, location_mode, location_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, created_at, updated_at`,
		req.ParentUserID, req.StudentProfileID, req.SubjectID, req.CurriculumID, req.LevelID,
		req.Goals, req.PreferredDays, req.PreferredTime, req.Timezone, req.LocationMode, req.LocationID,
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create private tuition request: %w", err)
	}
	return nil
}

func (r *PrivateTuitionRequestRepo) GetByID(ctx context.Context, id uuid.UUID) (*booking.PrivateTuitionRequest, error) {
	var req booking.PrivateTuitionRequest
	var curriculumID, levelID, locID, matchedTutor uuidNull
	var goals, preferredDays, preferredTime sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, parent_user_id, student_profile_id, subject_id, curriculum_id, level_id,
			goals, preferred_days, preferred_time_range, timezone, location_mode, location_id,
			status, matched_tutor_id, created_at, updated_at
		FROM private_tuition_requests WHERE id = $1`, id).
		Scan(&req.ID, &req.ParentUserID, &req.StudentProfileID, &req.SubjectID,
			&curriculumID, &levelID, &goals, &preferredDays, &preferredTime, &req.Timezone,
			&req.LocationMode, &locID, &req.Status, &matchedTutor, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if curriculumID.Valid {
		req.CurriculumID = &curriculumID.UUID
	}
	if levelID.Valid {
		req.LevelID = &levelID.UUID
	}
	if locID.Valid {
		req.LocationID = &locID.UUID
	}
	if matchedTutor.Valid {
		req.MatchedTutorID = &matchedTutor.UUID
	}
	if goals.Valid {
		req.Goals = &goals.String
	}
	if preferredDays.Valid {
		req.PreferredDays = &preferredDays.String
	}
	if preferredTime.Valid {
		req.PreferredTime = &preferredTime.String
	}
	return &req, nil
}

// SetMatchedTutor records the tutor an admin matched to the request.
func (r *PrivateTuitionRequestRepo) SetMatchedTutor(ctx context.Context, id, tutorProfileID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `UPDATE private_tuition_requests SET matched_tutor_id=$1, updated_at=NOW() WHERE id=$2`, tutorProfileID, id)
	if err != nil {
		return fmt.Errorf("set matched tutor: %w", err)
	}
	return nil
}

// UpdateStatus advances a request's status.
func (r *PrivateTuitionRequestRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status booking.PrivateRequestStatus) error {
	_, err := r.db.ExecContext(ctx, `UPDATE private_tuition_requests SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
	if err != nil {
		return fmt.Errorf("update private request status: %w", err)
	}
	return nil
}

const privateRequestColumns = `id, parent_user_id, student_profile_id, subject_id, curriculum_id, level_id,
	goals, preferred_days, preferred_time_range, timezone, location_mode, location_id,
	status, matched_tutor_id, created_at, updated_at`

func scanPrivateRequest(row interface{ Scan(...any) error }) (*booking.PrivateTuitionRequest, error) {
	var req booking.PrivateTuitionRequest
	var curriculumID, levelID, locID, matchedTutor uuidNull
	var goals, preferredDays, preferredTime sql.NullString
	if err := row.Scan(&req.ID, &req.ParentUserID, &req.StudentProfileID, &req.SubjectID,
		&curriculumID, &levelID, &goals, &preferredDays, &preferredTime, &req.Timezone,
		&req.LocationMode, &locID, &req.Status, &matchedTutor, &req.CreatedAt, &req.UpdatedAt); err != nil {
		return nil, err
	}
	if curriculumID.Valid {
		req.CurriculumID = &curriculumID.UUID
	}
	if levelID.Valid {
		req.LevelID = &levelID.UUID
	}
	if locID.Valid {
		req.LocationID = &locID.UUID
	}
	if matchedTutor.Valid {
		req.MatchedTutorID = &matchedTutor.UUID
	}
	if goals.Valid {
		req.Goals = &goals.String
	}
	if preferredDays.Valid {
		req.PreferredDays = &preferredDays.String
	}
	if preferredTime.Valid {
		req.PreferredTime = &preferredTime.String
	}
	return &req, nil
}

// ListByParent returns a parent's own requests, newest first.
func (r *PrivateTuitionRequestRepo) ListByParent(ctx context.Context, parentUserID uuid.UUID, limit int) ([]booking.PrivateTuitionRequest, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+privateRequestColumns+`
		FROM private_tuition_requests WHERE parent_user_id=$1 ORDER BY created_at DESC LIMIT $2`, parentUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("list private requests by parent: %w", err)
	}
	defer rows.Close()
	out := []booking.PrivateTuitionRequest{}
	for rows.Next() {
		req, err := scanPrivateRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *req)
	}
	return out, rows.Err()
}

// ListAll returns the admin matching queue, newest first.
func (r *PrivateTuitionRequestRepo) ListAll(ctx context.Context, status string, page, pageSize int) ([]booking.PrivateTuitionRequest, int64, error) {
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE status = $1"
		args = append(args, status)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM private_tuition_requests"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count private requests: %w", err)
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
	rows, err := r.db.QueryContext(ctx, `SELECT `+privateRequestColumns+` FROM private_tuition_requests`+where+
		` ORDER BY created_at DESC LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list all private requests: %w", err)
	}
	defer rows.Close()
	out := []booking.PrivateTuitionRequest{}
	for rows.Next() {
		req, err := scanPrivateRequest(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *req)
	}
	return out, total, rows.Err()
}

type PrivatePackageRepo struct{ db TxQuerier }

func NewPrivatePackageRepo(db TxQuerier) *PrivatePackageRepo { return &PrivatePackageRepo{db: db} }

func (r *PrivatePackageRepo) Create(ctx context.Context, p *booking.PrivatePackage) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO private_packages
			(request_id, tutor_profile_id, student_profile_id, total_sessions, sessions_used,
			 session_duration_minutes, price_per_session, total_price, currency, valid_from, valid_until, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at, updated_at`,
		p.RequestID, p.TutorProfileID, p.StudentProfileID, p.TotalSessions, p.SessionsUsed,
		p.SessionDurationMins, p.PricePerSession, p.TotalPrice, p.Currency, p.ValidFrom, p.ValidUntil, p.Status,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create private package: %w", err)
	}
	return nil
}

func (r *PrivatePackageRepo) GetByID(ctx context.Context, id uuid.UUID) (*booking.PrivatePackage, error) {
	var p booking.PrivatePackage
	var validUntil sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, request_id, tutor_profile_id, student_profile_id, total_sessions, sessions_used,
			session_duration_minutes, price_per_session, total_price, currency, valid_from, valid_until, status,
			created_at, updated_at
		FROM private_packages WHERE id = $1`, id).
		Scan(&p.ID, &p.RequestID, &p.TutorProfileID, &p.StudentProfileID, &p.TotalSessions,
			&p.SessionsUsed, &p.SessionDurationMins, &p.PricePerSession, &p.TotalPrice,
			&p.Currency, &p.ValidFrom, &validUntil, &p.Status, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if validUntil.Valid {
		p.ValidUntil = &validUntil.Time
	}
	return &p, nil
}

// UpdateStatus — transition a package to a new status (YK-004: activate only
// after settlement). Idempotent on the resulting status.
func (r *PrivatePackageRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	res, err := r.db.ExecContext(ctx, `UPDATE private_packages SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("update private package status: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

var _ booking.CohortRepository = (*CohortRepo)(nil)
var _ booking.CohortEnrollmentRepository = (*CohortEnrollmentRepo)(nil)
var _ booking.PrivateTuitionRequestRepository = (*PrivateTuitionRequestRepo)(nil)
var _ booking.PrivatePackageRepository = (*PrivatePackageRepo)(nil)
