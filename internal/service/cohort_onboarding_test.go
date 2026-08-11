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

func TestCohortService_ListPublished_OnlyPublished(t *testing.T) {
	store := memory.NewMemoryStore()
	store.Cohorts.Seed(&booking.Cohort{
		ID: uuid.New(), ProgrammeID: uuid.New(), Title: "Jan Cohort", Slug: "jan",
		Capacity: 20, StartDate: time.Now(), EndDate: time.Now().AddDate(0, 3, 0),
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 50000, Currency: "NGN",
		Status: booking.CohortPublished,
	})
	store.Cohorts.Seed(&booking.Cohort{
		ID: uuid.New(), ProgrammeID: uuid.New(), Title: "Draft Cohort", Slug: "draft",
		Capacity: 20, StartDate: time.Now(), EndDate: time.Now().AddDate(0, 3, 0),
		Timezone: "UTC", LocationMode: "ONLINE", Fee: 100, Currency: "NGN",
		Status: booking.CohortDraft,
	})

	svc := NewCohortService(store.Cohorts, newMemCache())
	cohorts, total, err := svc.ListPublished(context.Background(), booking.CohortListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "Jan Cohort", cohorts[0].Title)
}

func TestLessonService_AttendanceAndNotes(t *testing.T) {
	lessons := memory.NewLessonMemory()
	tutorID := uuid.New()
	lesson := &booking.Lesson{
		ID: uuid.New(), TutorProfileID: tutorID, Title: "Session 1",
		StartAt: time.Now(), EndAt: time.Now().Add(time.Hour),
		Timezone: "UTC", MeetingProvider: "GOOGLE_MEET", Status: booking.LessonScheduled,
	}
	lessons.Seed(lesson)

	svc := NewLessonService(lessons, memory.NewAttendanceMemory(), memory.NewLessonNoteMemory(),
		memory.NewResourceMemory(), memory.NewAssignmentMemory())
	ctx := context.Background()
	student := uuid.New()

	require.NoError(t, svc.MarkAttendance(ctx, uuid.New(), lesson.ID, student, "PRESENT", strPtr("on time")))
	list, err := svc.ListLessonAttendance(ctx, lesson.ID)
	require.NoError(t, err)
	assert.Len(t, list, 1)
	assert.Equal(t, "PRESENT", list[0].Status)

	err = svc.MarkAttendance(ctx, uuid.New(), lesson.ID, student, "MAYBE", nil)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = svc.AddLessonNote(ctx, uuid.New(), lesson.ID, &student, "  ", nil, true)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	hw := "Solve exercises 3-7"
	note, err := svc.AddLessonNote(ctx, uuid.New(), lesson.ID, &student, "Covered quadratic equations", &hw, true)
	require.NoError(t, err)
	assert.Equal(t, tutorID, note.TutorProfileID)

	notes, err := svc.ListLessonNotes(ctx, lesson.ID)
	require.NoError(t, err)
	assert.Len(t, notes, 1)
	assert.Equal(t, "Solve exercises 3-7", *notes[0].Homework)
}

func TestLessonService_OwnershipEnforced(t *testing.T) {
	store := memory.NewMemoryStore()
	lessons := memory.NewLessonMemory()
	owner := uuid.New()
	profileID := uuid.New()
	store.Vetting.SeedProfile(&tutor.TutorProfile{
		ID: profileID, UserID: owner, Slug: "owner", DisplayName: "Owner",
		Status: tutor.TutorStatusApproved, IsPublic: true,
	})

	lesson := &booking.Lesson{ID: uuid.New(), TutorProfileID: profileID, Title: "Private",
		StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Timezone: "UTC", Status: booking.LessonScheduled}
	lessons.Seed(lesson)

	svc := NewLessonService(lessons, memory.NewAttendanceMemory(), memory.NewLessonNoteMemory(),
		memory.NewResourceMemory(), memory.NewAssignmentMemory())
	svc.WithTutorReader(func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
		return store.Vetting.GetProfileByID(ctx, id)
	})
	ctx := context.Background()

	err := svc.MarkAttendance(ctx, uuid.New(), lesson.ID, uuid.New(), "PRESENT", nil)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	require.NoError(t, svc.MarkAttendance(ctx, owner, lesson.ID, uuid.New(), "PRESENT", nil))
}

func TestOnboarding_CreateLearner_LinksParent(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewOnboardingService(store.Students, store.StudentLinks, NewAuditService(store.AuditLogs))
	ctx := context.Background()
	parent := uuid.New()

	learner, err := svc.CreateLearner(ctx, CreateLearnerInput{
		ParentUserID: parent,
		FirstName:    "Adaeze", LastName: "Okafor",
		SchoolName: strPtr("Lagos Prep"), CurrentLevel: strPtr("Year 7"),
	})
	require.NoError(t, err)
	assert.Equal(t, "Adaeze", learner.FirstName)

	// Parent sees the linked learner.
	learners, err := svc.ListLearners(ctx, parent)
	require.NoError(t, err)
	assert.Len(t, learners, 1)

	// Validation.
	_, err = svc.CreateLearner(ctx, CreateLearnerInput{ParentUserID: parent, FirstName: "", LastName: "X"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}
