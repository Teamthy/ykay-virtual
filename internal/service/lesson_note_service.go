package service

import (
	"context"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/lessonnote"
)

// LessonNoteService — lesson bookmarks & timestamped player notes (feature 5).
// Authorization (is the actor a participant of the lesson?) is enforced by the
// handler via the existing LessonService participation gate; this service owns
// only the note CRUD, scoped so a user can delete only their own notes.
type LessonNoteService struct {
	repo lessonnote.Repository
}

func NewLessonNoteService(repo lessonnote.Repository) *LessonNoteService {
	return &LessonNoteService{repo: repo}
}

func (s *LessonNoteService) Add(ctx context.Context, lessonID, userID uuid.UUID, role string, timestampSec int, bookmark bool, text string) (*lessonnote.PlayerNote, error) {
	if role != "STUDENT" && role != "PARENT" && role != "TUTOR" {
		return nil, domain.ErrInvalidInput
	}
	if timestampSec < 0 {
		return nil, domain.ErrInvalidInput
	}
	if !bookmark && text == "" {
		return nil, domain.ErrInvalidInput
	}
	n := &lessonnote.PlayerNote{
		LessonID:     lessonID,
		UserID:       userID,
		Role:         role,
		TimestampSec: timestampSec,
		IsBookmark:   bookmark,
		Text:         text,
	}
	if err := s.repo.Add(ctx, n); err != nil {
		return nil, err
	}
	return n, nil
}

func (s *LessonNoteService) ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]lessonnote.PlayerNote, error) {
	return s.repo.ListByLesson(ctx, lessonID)
}

func (s *LessonNoteService) Delete(ctx context.Context, id, userID uuid.UUID) error {
	return s.repo.Delete(ctx, id, userID)
}
