package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// FR-23 — reschedule / cancel self-service (tutor own lesson or admin),
// double-booking guarded via HasOverlappingLessons(exclude=self).

func newRescheduleEnv(t *testing.T) (svc *LessonService, lessons *memory.LessonMemory, owner uuid.UUID, profileID uuid.UUID) {
	t.Helper()
	store := memory.NewMemoryStore()
	owner, profileID, _ = seedOwnedCohort(t, store)
	lessons = memory.NewLessonMemory()
	svc = NewLessonService(lessons, memory.NewAttendanceMemory(),
		memory.NewLessonNoteMemory(), memory.NewResourceMemory(), memory.NewAssignmentMemory()).
		WithTutorReader(func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
			return store.Vetting.GetProfileByID(ctx, id)
		}).
		WithCohortReader(store.Cohorts.GetByID)
	return svc, lessons, owner, profileID
}

func seedLesson(lessons *memory.LessonMemory, tutorProfileID uuid.UUID, start time.Time, status booking.LessonStatus) *booking.Lesson {
	l := &booking.Lesson{
		ID: uuid.New(), TutorProfileID: tutorProfileID, Title: "Session",
		StartAt: start, EndAt: start.Add(time.Hour), Timezone: "UTC", Status: status,
	}
	lessons.Seed(l)
	return l
}

func TestRescheduleLesson_OwnerMovesLesson(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Hour)
	l := seedLesson(lessons, profileID, t0, booking.LessonScheduled)

	moved, err := svc.RescheduleLesson(ctx, owner, false, l.ID, t0.Add(48*time.Hour), t0.Add(49*time.Hour))
	require.NoError(t, err)
	assert.Equal(t, booking.LessonRescheduled, moved.Status)

	got, _ := lessons.GetByID(ctx, l.ID)
	assert.Equal(t, t0.Add(48*time.Hour), got.StartAt)
	assert.Equal(t, booking.LessonRescheduled, got.Status)
}

func TestRescheduleLesson_DoubleBookingGuard(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Hour)
	l1 := seedLesson(lessons, profileID, t0, booking.LessonScheduled)
	seedLesson(lessons, profileID, t0.Add(3*time.Hour), booking.LessonScheduled)

	// Moving l1 onto the other lesson's window → conflict.
	_, err := svc.RescheduleLesson(ctx, owner, false, l1.ID, t0.Add(3*time.Hour), t0.Add(4*time.Hour))
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Moving l1 onto ITS OWN window is fine (self excluded from the guard).
	_, err = svc.RescheduleLesson(ctx, owner, false, l1.ID, t0.Add(30*time.Minute), t0.Add(90*time.Minute))
	assert.NoError(t, err)
}

func TestRescheduleLesson_AuthzAndState(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Hour)

	// A stranger (not the lesson's tutor, not admin) is refused.
	l := seedLesson(lessons, profileID, t0, booking.LessonScheduled)
	_, err := svc.RescheduleLesson(ctx, uuid.New(), false, l.ID, t0.Add(5*time.Hour), t0.Add(6*time.Hour))
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// An admin may move any lesson.
	_, err = svc.RescheduleLesson(ctx, uuid.New(), true, l.ID, t0.Add(5*time.Hour), t0.Add(6*time.Hour))
	assert.NoError(t, err)

	// Completed/cancelled lessons are immutable.
	done := seedLesson(lessons, profileID, t0.Add(100*time.Hour), booking.LessonCompleted)
	_, err = svc.RescheduleLesson(ctx, owner, false, done.ID, t0.Add(200*time.Hour), t0.Add(201*time.Hour))
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Invalid window.
	_, err = svc.RescheduleLesson(ctx, owner, false, l.ID, t0.Add(2*time.Hour), t0.Add(2*time.Hour))
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCancelLesson_LifecycleAndCalendarRelease(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Hour)
	l := seedLesson(lessons, profileID, t0, booking.LessonScheduled)

	cancelled, err := svc.CancelLesson(ctx, owner, false, l.ID)
	require.NoError(t, err)
	assert.Equal(t, booking.LessonCancelled, cancelled.Status)

	// Cancelling again → conflict.
	_, err = svc.CancelLesson(ctx, owner, false, l.ID)
	assert.ErrorIs(t, err, domain.ErrConflict)

	// The cancelled slot no longer blocks the tutor's calendar.
	conflict, err := lessons.HasOverlappingLessons(ctx, profileID, t0, t0.Add(time.Hour), nil)
	require.NoError(t, err)
	assert.False(t, conflict, "cancelled lesson must release the calendar slot")

	// Stranger cannot cancel.
	l2 := seedLesson(lessons, profileID, t0.Add(10*time.Hour), booking.LessonScheduled)
	_, err = svc.CancelLesson(ctx, uuid.New(), false, l2.ID)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}
