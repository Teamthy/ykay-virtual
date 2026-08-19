package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/booking"
)

// LinkStudentToCohortLessons — connects a learner to the cohort's lessons
// starting at or after `from`. Idempotent (ON CONFLICT DO NOTHING).
func (r *LessonRepo) LinkStudentToCohortLessons(ctx context.Context, cohortID, studentProfileID uuid.UUID, from time.Time) (int64, error) {
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO lesson_participants (lesson_id, student_profile_id, joined_at, created_at)
		SELECT id, $2, NOW(), NOW() FROM lessons
		WHERE cohort_id = $1 AND start_at >= $3
		ON CONFLICT (lesson_id, student_profile_id) DO NOTHING`,
		cohortID, studentProfileID, from)
	if err != nil {
		return 0, fmt.Errorf("link student to cohort lessons: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// LessonRepo — read side for lesson lists (dashboards).

type LessonRepo struct{ db TxQuerier }

func NewLessonRepo(db TxQuerier) *LessonRepo { return &LessonRepo{db: db} }

func scanLessonRow(row interface{ Scan(...any) error }) (*booking.Lesson, error) {
	var l booking.Lesson
	var cohortID, pkgID, locID, createdBy uuidNull
	var desc, meetingURL, videoURL sql.NullString
	if err := row.Scan(&l.ID, &cohortID, &pkgID, &l.TutorProfileID, &l.Title, &desc,
		&l.StartAt, &l.EndAt, &l.Timezone, &meetingURL, &l.MeetingProvider, &locID,
		&l.Status, &createdBy, &l.CreatedAt, &l.UpdatedAt, &videoURL); err != nil {
		return nil, err
	}
	if cohortID.Valid {
		l.CohortID = &cohortID.UUID
	}
	if pkgID.Valid {
		l.PrivatePackageID = &pkgID.UUID
	}
	if locID.Valid {
		l.LocationID = &locID.UUID
	}
	if createdBy.Valid {
		l.CreatedBy = &createdBy.UUID
	}
	if desc.Valid {
		l.Description = &desc.String
	}
	if meetingURL.Valid {
		l.MeetingURL = &meetingURL.String
	}
	if videoURL.Valid {
		l.VideoURL = &videoURL.String
	}
	return &l, nil
}

func (r *LessonRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at, l.video_url
		FROM lessons l
		JOIN lesson_participants lp ON lp.lesson_id = l.id
		WHERE lp.student_profile_id = $1
		ORDER BY l.start_at DESC LIMIT $2`, studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list lessons by student: %w", err)
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

func (r *LessonRepo) ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at, l.video_url
		FROM lessons l
		WHERE l.tutor_profile_id = $1 ORDER BY l.start_at DESC LIMIT $2`, tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list lessons by tutor: %w", err)
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

var _ booking.LessonRepository = (*LessonRepo)(nil)

// Create inserts a scheduled lesson. The double-booking guard is enforced in
// the service; this simply writes the row (meeting_provider defaults to
// GOOGLE_MEET when empty).
func (r *LessonRepo) Create(ctx context.Context, l *booking.Lesson) error {
	if l.MeetingProvider == "" {
		l.MeetingProvider = "GOOGLE_MEET"
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO lessons (cohort_id, private_package_id, tutor_profile_id, title, description,
			start_at, end_at, timezone, meeting_url, meeting_provider, location_id, status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, created_at, updated_at`,
		l.CohortID, l.PrivatePackageID, l.TutorProfileID, l.Title, l.Description,
		l.StartAt, l.EndAt, l.Timezone, l.MeetingURL, l.MeetingProvider, l.LocationID,
		l.Status, l.CreatedBy,
	).Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create lesson: %w", err)
	}
	return nil
}

// SetVideoURL attaches (or clears) a recorded-lesson video URL.
func (r *LessonRepo) SetVideoURL(ctx context.Context, lessonID uuid.UUID, videoURL *string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE lessons SET video_url=$1, updated_at=NOW() WHERE id=$2`, videoURL, lessonID)
	if err != nil {
		return fmt.Errorf("set lesson video url: %w", err)
	}
	return nil
}

// ListRecordedForStudent returns the recorded (video) lessons the student is
// entitled to, via their lesson_participants links, newest first.
func (r *LessonRepo) ListRecordedForStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at, l.video_url
		FROM lessons l
		JOIN lesson_participants lp ON lp.lesson_id = l.id
		WHERE lp.student_profile_id = $1 AND l.video_url IS NOT NULL AND l.status <> 'CANCELLED'
		ORDER BY l.start_at DESC LIMIT $2`, studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list recorded lessons for student: %w", err)
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

// HasOverlappingLessons — the double-booking guard (FR-10 / AC-05). Returns
// true when the tutor already has a NON-cancelled live lesson whose window
// overlaps [startAt, endAt). Uses the idx_lessons_tutor_time index. The
// excludeLessonID lets a reschedule ignore the lesson being moved.
func (r *LessonRepo) HasOverlappingLessons(ctx context.Context, tutorProfileID uuid.UUID, startAt, endAt time.Time, excludeLessonID *uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM lessons
			WHERE tutor_profile_id = $1
			  AND status <> 'CANCELLED'
			  AND start_at < $3
			  AND end_at > $2
			  AND ($4::uuid IS NULL OR id <> $4)
		)`, tutorProfileID, startAt, endAt, excludeLessonID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check overlapping lessons: %w", err)
	}
	return exists, nil
}
