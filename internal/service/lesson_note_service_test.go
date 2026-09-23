package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/repository/memory"
)

func TestLessonNote_AddValidatesAndDeletesOwnerOnly(t *testing.T) {
	ctx := context.Background()
	svc := NewLessonNoteService(memory.NewLessonNoteMemory())
	lesson := uuid.New()
	owner := uuid.New()
	other := uuid.New()

	// A bookmark needs no text; a note needs text.
	_, err := svc.Add(ctx, lesson, owner, "STUDENT", 30, true, "")
	require.NoError(t, err)
	_, err = svc.Add(ctx, lesson, owner, "STUDENT", 45, false, "")
	require.ErrorIs(t, err, domain.ErrInvalidInput, "a non-bookmark note needs text")
	_, err = svc.Add(ctx, lesson, owner, "ALIEN", 10, true, "")
	require.ErrorIs(t, err, domain.ErrInvalidInput, "unknown role rejected")

	note, err := svc.Add(ctx, lesson, owner, "STUDENT", 60, false, "revisit this")
	require.NoError(t, err)

	// Another participant cannot delete someone else's note.
	require.ErrorIs(t, svc.Delete(ctx, note.ID, other), domain.ErrNotFound)
	// The owner can.
	require.NoError(t, svc.Delete(ctx, note.ID, owner))

	notes, err := svc.ListByLesson(ctx, lesson)
	require.NoError(t, err)
	assert.Len(t, notes, 1, "only the bookmark remains")
	assert.True(t, notes[0].IsBookmark)
}
