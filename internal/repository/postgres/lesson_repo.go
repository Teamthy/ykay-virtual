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
	var desc, meetingURL sql.NullString
	if err := row.Scan(&l.ID, &cohortID, &pkgID, &l.TutorProfileID, &l.Title, &desc,
		&l.StartAt, &l.EndAt, &l.Timezone, &meetingURL, &l.MeetingProvider, &locID,
		&l.Status, &createdBy, &l.CreatedAt, &l.UpdatedAt); err != nil {
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
	return &l, nil
}

func (r *LessonRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at
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
			l.status, l.created_by, l.created_at, l.updated_at
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
