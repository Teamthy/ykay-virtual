package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
)

// MeetingRepo — narrow meeting-link surface for lessons (G4.2). Reads only
// the meeting columns so the existing lesson list scans stay untouched.

type MeetingRepo struct{ db TxQuerier }

func NewMeetingRepo(db TxQuerier) *MeetingRepo { return &MeetingRepo{db: db} }

func (r *MeetingRepo) GetLesson(ctx context.Context, lessonID uuid.UUID) (*booking.Lesson, error) {
	var l booking.Lesson
	err := r.db.QueryRowContext(ctx, `
		SELECT id, tutor_profile_id, title, start_at, end_at, meeting_provider
		FROM lessons WHERE id = $1`, lessonID).
		Scan(&l.ID, &l.TutorProfileID, &l.Title, &l.StartAt, &l.EndAt, &l.MeetingProvider)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &l, nil
}

func (r *MeetingRepo) GetMeeting(ctx context.Context, lessonID uuid.UUID) (*booking.LessonMeeting, error) {
	var m booking.LessonMeeting
	var ref, url sql.NullString
	var expires sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, COALESCE(meeting_provider,''), meeting_ref, meeting_url, meeting_expires_at, join_window_minutes
		FROM lessons WHERE id = $1`, lessonID).
		Scan(&m.LessonID, &m.Provider, &ref, &url, &expires, &m.JoinWindowMinutes)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if ref.Valid {
		m.ProviderRef = ref.String
	}
	if url.Valid {
		m.MeetingURL = url.String
	}
	if expires.Valid {
		m.ExpiresAt = &expires.Time
	}
	return &m, nil
}

func (r *MeetingRepo) UpsertMeeting(ctx context.Context, m booking.LessonMeeting) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE lessons
		SET meeting_provider = $2, meeting_ref = $3, meeting_url = $4,
		    meeting_expires_at = $5, join_window_minutes = $6
		WHERE id = $1`,
		m.LessonID, m.Provider, m.ProviderRef, m.MeetingURL, m.ExpiresAt, m.JoinWindowMinutes)
	return err
}

// IsParticipant — the learner attends via lesson_participants.
func (r *MeetingRepo) IsParticipant(ctx context.Context, lessonID, studentProfileID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM lesson_participants
		WHERE lesson_id = $1 AND student_profile_id = $2 LIMIT 1`, lessonID, studentProfileID).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

var _ = time.Now // keep time import if future expiry logic lands here
