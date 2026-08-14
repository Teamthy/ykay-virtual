package booking

import (
	"time"

	"github.com/google/uuid"
)

// LessonMeeting — provider-neutral meeting-link state persisted on the
// lesson (G4.2). Kept separate from Lesson so the many lesson list scans
// don't carry columns they never use.
type LessonMeeting struct {
	LessonID          uuid.UUID  `json:"lesson_id"`
	Provider          string     `json:"provider"`     // "whereby" | "stub"
	ProviderRef       string     `json:"provider_ref"` // idempotent refresh key
	MeetingURL        string     `json:"meeting_url"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
	JoinWindowMinutes int        `json:"join_window_minutes"`
}

// JoinWindowOpen reports whether a participant may join right now.
// Window = [start − join_window, end + grace]. Tutors are handled by the
// caller (hosts may enter early); grace is fixed at 30 minutes.
func (m LessonMeeting) JoinWindowOpen(startAt, endAt time.Time, now time.Time) bool {
	grace := 30 * time.Minute
	window := time.Duration(m.JoinWindowMinutes) * time.Minute
	if m.JoinWindowMinutes <= 0 {
		window = 15 * time.Minute
	}
	openAt := startAt.Add(-window)
	closeAt := endAt.Add(grace)
	return now.After(openAt) && now.Before(closeAt)
}
