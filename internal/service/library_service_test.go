package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/library"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubParticipant struct {
	participating map[uuid.UUID]map[uuid.UUID]bool // lesson -> student -> ok
}

func (s *stubParticipant) IsParticipant(_ context.Context, lessonID, studentID uuid.UUID) (bool, error) {
	return s.participating[lessonID][studentID], nil
}

func newLibraryItem(id uuid.UUID, title string, visible, featured bool, videoURL string) library.Item {
	u := videoURL
	var video *string
	if videoURL != "" {
		video = &u
	}
	return library.Item{
		LessonID:  id,
		Title:     title,
		VideoURL:  video,
		Visible:   visible,
		Featured:  featured,
		StartAt:   time.Now().UTC(),
		SortOrder: 0,
	}
}

func TestLibraryService_Catalogue_GatesAndFilters(t *testing.T) {
	repo := memory.NewLibraryMemory()
	visibleID := uuid.New()
	hiddenID := uuid.New()
	repo.Seed(
		newLibraryItem(visibleID, "Algebra Masterclass", true, true, "https://v/algebra.mp4"),
		newLibraryItem(hiddenID, "Draft Lesson", false, false, "https://v/draft.mp4"),
	)

	participants := &stubParticipant{participating: map[uuid.UUID]map[uuid.UUID]bool{
		visibleID: {uuid.New(): true}, // some other student is a participant
	}}
	svc := NewLibraryService(repo, participants)

	// Anonymous viewer: metadata returned, video stripped.
	items, total, err := svc.Catalogue(context.Background(), library.Filter{Page: 1, PageSize: 20}, false, uuid.Nil)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total, "hidden items must not appear in the public catalogue")
	require.Len(t, items, 1)
	assert.Equal(t, "Algebra Masterclass", items[0].Title)
	assert.Nil(t, items[0].VideoURL, "anonymous viewer must not get the video URL")
	assert.False(t, items[0].Entitled)

	// Entitled student: video + transcript are returned.
	enrolledStudent := uuid.New()
	participants.participating[visibleID] = map[uuid.UUID]bool{enrolledStudent: true}
	svc2 := NewLibraryService(repo, participants).WithStudentResolvers(
		func(_ context.Context, uid uuid.UUID) (*identity.StudentProfile, error) {
			if uid == enrolledStudent {
				return &identity.StudentProfile{ID: enrolledStudent}, nil
			}
			return nil, nil
		},
		nil,
	)
	items, _, err = svc2.Catalogue(context.Background(), library.Filter{Page: 1, PageSize: 20}, false, enrolledStudent)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.NotNil(t, items[0].VideoURL, "entitled student must get the video URL")
	assert.True(t, items[0].Entitled)

	// Admin always entitled.
	items, _, err = svc.Catalogue(context.Background(), library.Filter{Page: 1, PageSize: 20}, true, uuid.Nil)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.NotNil(t, items[0].VideoURL)
	assert.True(t, items[0].Entitled)
}

func TestLibraryService_Featured_NeverExposesVideo(t *testing.T) {
	repo := memory.NewLibraryMemory()
	repo.Seed(
		newLibraryItem(uuid.New(), "Featured One", true, true, "https://v/one.mp4"),
		newLibraryItem(uuid.New(), "Not Featured", true, false, "https://v/no.mp4"),
	)
	svc := NewLibraryService(repo, nil)
	items, err := svc.Featured(context.Background(), 8)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "Featured One", items[0].Title)
	assert.Nil(t, items[0].VideoURL, "featured rail must never leak the video URL")
}

func TestLibraryService_UpdateMeta_PartialMerge(t *testing.T) {
	repo := memory.NewLibraryMemory()
	id := uuid.New()
	repo.Seed(newLibraryItem(id, "Curated Lesson", true, false, "https://v/curated.mp4"))
	svc := NewLibraryService(repo, nil)

	// Feature it + set duration, keep visibility as-is.
	featured := true
	seconds := 900
	err := svc.UpdateMeta(context.Background(), id, library.UpdateMetaInput{
		Featured:        &featured,
		DurationSeconds: &seconds,
	})
	require.NoError(t, err)

	it, err := svc.Get(context.Background(), id, true, uuid.Nil)
	require.NoError(t, err)
	assert.True(t, it.Featured)
	assert.True(t, it.Visible, "visibility untouched by partial update")
	require.NotNil(t, it.DurationSeconds)
	assert.Equal(t, 900, *it.DurationSeconds)
}

func TestLibraryService_UpdateMeta_RejectsNegative(t *testing.T) {
	repo := memory.NewLibraryMemory()
	id := uuid.New()
	repo.Seed(newLibraryItem(id, "Bad Input", true, false, "https://v/bad.mp4"))
	svc := NewLibraryService(repo, nil)

	neg := -5
	err := svc.UpdateMeta(context.Background(), id, library.UpdateMetaInput{DurationSeconds: &neg})
	require.Error(t, err)
}

func TestLibraryService_DownloadURL_RequiresPlus(t *testing.T) {
	ctx := context.Background()
	repo := memory.NewLibraryMemory()
	student := uuid.New()
	id := uuid.New()
	repo.Seed(newLibraryItem(id, "Offline Lesson", true, false, "https://v/offline.mp4"))

	participants := &stubParticipant{participating: map[uuid.UUID]map[uuid.UUID]bool{
		id: {student: true},
	}}
	store := memory.NewMemoryStore()
	plusSvc := NewPlusService(store.Plus, NewAuditService(store.AuditLogs))
	plusSvc.EnsureDefaultPlans(ctx)
	svc := NewLibraryService(repo, participants).WithPlus(plusSvc).WithStudentResolvers(
		func(_ context.Context, uid uuid.UUID) (*identity.StudentProfile, error) {
			if uid == student {
				return &identity.StudentProfile{ID: student}, nil
			}
			return nil, nil
		}, nil)

	// Entitled but NOT Plus -> 402 (premium required).
	_, err := svc.DownloadURL(ctx, false, student, id)
	require.ErrorIs(t, err, plus.ErrPremiumRequired)

	// Plus -> authorized URL.
	_, _ = plusSvc.ActivatePlan(ctx, student, plus.PlanPlus, false)
	url, err := svc.DownloadURL(ctx, false, student, id)
	require.NoError(t, err)
	require.NotNil(t, url)
	assert.Equal(t, "https://v/offline.mp4", *url)

	// Non-entitled viewer -> forbidden.
	_, err = svc.DownloadURL(ctx, false, uuid.New(), id)
	require.ErrorIs(t, err, domain.ErrForbidden)
}
