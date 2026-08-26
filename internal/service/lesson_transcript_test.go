package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Lesson transcripts (migration 000061) — tutor-of-cohort or admin can
// attach/clear; anyone else is refused; oversized transcripts rejected.

func TestSetLessonTranscript_OwnerAttachesAndClears(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	l := seedLesson(lessons, profileID, time.Now().Add(2*time.Hour).UTC(), booking.LessonScheduled)

	text := "Key points: factorisation, quadratic formula. Homework: ex 4.2 q1-q8."
	require.NoError(t, svc.SetLessonTranscript(ctx, owner, false, l.ID, &text))

	got, err := lessons.GetByID(ctx, l.ID)
	require.NoError(t, err)
	require.NotNil(t, got.Transcript)
	assert.Equal(t, text, *got.Transcript)

	// Clear with an empty value.
	empty := ""
	require.NoError(t, svc.SetLessonTranscript(ctx, owner, false, l.ID, &empty))
	got, _ = lessons.GetByID(ctx, l.ID)
	assert.Equal(t, "", *got.Transcript, "empty string clears the transcript content")
}

func TestSetLessonTranscript_Authz(t *testing.T) {
	svc, lessons, _, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	l := seedLesson(lessons, profileID, time.Now().Add(2*time.Hour).UTC(), booking.LessonScheduled)

	// A random non-owner tutor is refused.
	text := "should not save"
	err := svc.SetLessonTranscript(ctx, uuid.New(), false, l.ID, &text)
	assert.ErrorIs(t, err, domain.ErrForbidden)
	got, _ := lessons.GetByID(ctx, l.ID)
	assert.Nil(t, got.Transcript, "refused write must not persist")

	// An admin may attach to any lesson.
	require.NoError(t, svc.SetLessonTranscript(ctx, uuid.New(), true, l.ID, &text))
	got, _ = lessons.GetByID(ctx, l.ID)
	require.NotNil(t, got.Transcript)
	assert.Equal(t, text, *got.Transcript)

	// Unknown lesson → not found.
	err = svc.SetLessonTranscript(ctx, uuid.New(), true, uuid.New(), &text)
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestSetLessonTranscript_RejectsOversized(t *testing.T) {
	svc, lessons, owner, profileID := newRescheduleEnv(t)
	ctx := context.Background()
	l := seedLesson(lessons, profileID, time.Now().Add(2*time.Hour).UTC(), booking.LessonScheduled)

	huge := make([]byte, 100_001)
	for i := range huge {
		huge[i] = 'a'
	}
	big := string(huge)
	err := svc.SetLessonTranscript(ctx, owner, false, l.ID, &big)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
	got, _ := lessons.GetByID(ctx, l.ID)
	assert.Nil(t, got.Transcript)
}
