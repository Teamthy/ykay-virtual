package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A-02 regressions: teaching-ops authorization must be enforced, and must
// FAIL CLOSED when the ownership lookups are not wired (the previous
// nil-guard silently allowed any authenticated caller).

func seedOwnedCohort(t *testing.T, store *memory.MemoryStore) (owner uuid.UUID, profileID, cohortID uuid.UUID) {
	t.Helper()
	owner = uuid.New()
	profileID = uuid.New()
	store.Vetting.SeedProfile(&tutor.TutorProfile{
		ID: profileID, UserID: owner, Slug: "owner", DisplayName: "Owner",
		Status: tutor.TutorStatusApproved, IsPublic: true,
	})
	cohortID = uuid.New()
	store.Cohorts.Seed(&booking.Cohort{
		ID: cohortID, ProgrammeID: uuid.New(), Title: "Cohort", Slug: "cohort",
		Capacity: 10, StartDate: time.Now(), EndDate: time.Now().AddDate(0, 3, 0),
		Timezone: "UTC", LocationMode: "ONLINE", Fee: 100, Currency: "NGN",
		Status: booking.CohortPublished, TutorProfileID: &profileID,
	})
	return owner, profileID, cohortID
}

func newAuthzLessonSvc(store *memory.MemoryStore) *LessonService {
	svc := NewLessonService(memory.NewLessonMemory(), memory.NewAttendanceMemory(),
		memory.NewLessonNoteMemory(), memory.NewResourceMemory(), memory.NewAssignmentMemory()).
		WithTutorReader(func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
			return store.Vetting.GetProfileByID(ctx, id)
		}).
		WithCohortReader(store.Cohorts.GetByID).
		WithRoster(store.Enrollments, func(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error) {
			return store.Students.FindByID(ctx, id)
		}).
		WithEnrollmentAccess(
			func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
				return store.Students.FindByUserID(ctx, userID)
			},
			func(ctx context.Context, cohortID, studentProfileID uuid.UUID) (bool, error) {
				_, err := store.Enrollments.GetByCohortAndStudent(ctx, cohortID, studentProfileID)
				if err != nil {
					return false, nil
				}
				return true, nil
			},
		)
	return svc
}

func TestLessonService_OwnsLesson_FailsClosedWithoutReader(t *testing.T) {
	lessons := memory.NewLessonMemory()
	lesson := &booking.Lesson{
		ID: uuid.New(), TutorProfileID: uuid.New(), Title: "Session",
		StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Timezone: "UTC",
		Status: booking.LessonScheduled,
	}
	lessons.Seed(lesson)

	// No WithTutorReader → the ownership check must refuse (never allow).
	svc := NewLessonService(lessons, memory.NewAttendanceMemory(),
		memory.NewLessonNoteMemory(), memory.NewResourceMemory(), memory.NewAssignmentMemory())
	err := svc.MarkAttendance(context.Background(), uuid.New(), false, lesson.ID, uuid.New(), "PRESENT", nil)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestLessonService_CreateAssignment_RequiresCohortOwner(t *testing.T) {
	store := memory.NewMemoryStore()
	owner, _, cohortID := seedOwnedCohort(t, store)
	svc := newAuthzLessonSvc(store)
	ctx := context.Background()

	// An unrelated tutor (non-owner) cannot author into the cohort.
	_, err := svc.CreateAssignment(ctx, uuid.New(), false, cohortID, "HW", nil, nil, nil)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// The cohort's tutor can.
	_, err = svc.CreateAssignment(ctx, owner, false, cohortID, "HW", nil, nil, nil)
	require.NoError(t, err)

	// A platform admin can.
	_, err = svc.CreateAssignment(ctx, uuid.New(), true, cohortID, "HW2", nil, nil, nil)
	require.NoError(t, err)
}

func TestLessonService_ListCohortEnrollments_RequiresOwnerOrAdmin(t *testing.T) {
	store := memory.NewMemoryStore()
	owner, _, cohortID := seedOwnedCohort(t, store)
	require.NoError(t, store.Enrollments.Create(context.Background(), &booking.CohortEnrollment{
		ID: uuid.New(), CohortID: cohortID, StudentProfileID: uuid.New(),
		Status: booking.EnrollmentConfirmed, EnrolledAt: time.Now(),
	}))
	svc := newAuthzLessonSvc(store)
	ctx := context.Background()

	// Roster is learner PII: an unrelated tutor must not read it.
	_, err := svc.ListCohortEnrollments(ctx, uuid.New(), false, cohortID)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	list, err := svc.ListCohortEnrollments(ctx, owner, false, cohortID)
	require.NoError(t, err)
	assert.Len(t, list, 1)
}

func TestLessonService_CanAccessCohort_EnrolledLearner(t *testing.T) {
	store := memory.NewMemoryStore()
	_, _, cohortID := seedOwnedCohort(t, store)

	studentUser := uuid.New()
	studentProfile := &identity.StudentProfile{
		ID: uuid.New(), UserID: &studentUser, FirstName: "Ada", LastName: "Bello",
		GuardianConsent: true, Timezone: "UTC", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	require.NoError(t, store.Students.Create(context.Background(), studentProfile))
	require.NoError(t, store.Enrollments.Create(context.Background(), &booking.CohortEnrollment{
		ID: uuid.New(), CohortID: cohortID, StudentProfileID: studentProfile.ID,
		Status: booking.EnrollmentConfirmed, EnrolledAt: time.Now(),
	}))

	svc := newAuthzLessonSvc(store)
	ctx := context.Background()

	// An unrelated authenticated user cannot access cohort content.
	assert.False(t, svc.CanAccessCohort(ctx, uuid.New(), false, cohortID))
	// The enrolled learner can.
	assert.True(t, svc.CanAccessCohort(ctx, studentUser, false, cohortID))
	// Admin can.
	assert.True(t, svc.CanAccessCohort(ctx, uuid.New(), true, cohortID))
}
