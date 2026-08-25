package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Admin console hardening (2026-08-25): join requests must surface tutor and
// cohort DETAILS (never raw UUIDs), pending student enrolments are a view
// DISTINCT from tutor joins, and cohort edits enforce sane invariants.

type adminJoinEnv struct {
	svc   *AdminService
	store *memory.MemoryStore
}

func newAdminJoinEnv(t *testing.T) *adminJoinEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	store.Roles.Seed()
	audit := NewAuditService(store.AuditLogs)
	svc := NewAdminService(memory.NewStatsMemory(), memory.NewAdminBlogMemory(), memory.NewInstitutionMemory(),
		memory.NewReferralMemory(), memory.NewReviewMemory(), audit).
		WithCohortAdmin(store.Cohorts, store.Lessons).
		WithTutors(store.Tutors).
		WithEnrollments(store.Enrollments).
		WithStudents(store.Students)
	return &adminJoinEnv{svc: svc, store: store}
}

func TestListCohortJoins_ShowsTutorAndCohortDetails(t *testing.T) {
	env := newAdminJoinEnv(t)
	ctx := context.Background()

	cohort := &booking.Cohort{ID: uuid.New(), Title: "UTME 2026 Intensive", Capacity: 20, Status: booking.CohortDraft}
	require.NoError(t, env.store.Cohorts.Create(ctx, cohort))
	_, err := env.store.Cohorts.RequestJoin(ctx, cohort.ID, uuid.New(), nil)
	require.NoError(t, err)

	views, err := env.svc.ListCohortJoins(ctx, "PENDING")
	require.NoError(t, err)
	require.Len(t, views, 1)
	v := views[0]
	assert.Equal(t, "UTME 2026 Intensive", v.CohortTitle, "cohort title, not a UUID")
	assert.NotEqual(t, uuid.Nil.String(), v.CohortID)
	// No tutor profile exists for that random ID → graceful fallback, never
	// a raw UUID presented as a name.
	assert.Equal(t, "Unknown tutor", v.TutorName)
}

func TestListPendingEnrollments_DistinctFromJoins(t *testing.T) {
	env := newAdminJoinEnv(t)
	ctx := context.Background()

	cohort := &booking.Cohort{ID: uuid.New(), Title: "IGCSE Maths", Capacity: 10, Fee: 75000, Status: booking.CohortDraft}
	require.NoError(t, env.store.Cohorts.Create(ctx, cohort))
	student := &identity.StudentProfile{FirstName: "Test", LastName: "Student"}
	require.NoError(t, env.store.Students.Create(context.Background(), student))
	studentID := student.ID

	e := &booking.CohortEnrollment{CohortID: cohort.ID, StudentProfileID: studentID, ParentUserID: uuid.New(), Status: booking.EnrollmentPending}
	require.NoError(t, env.store.Enrollments.Create(ctx, e))

	rows, err := env.svc.ListPendingEnrollments(ctx, 50)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, "IGCSE Maths", rows[0].CohortTitle)
	assert.Equal(t, 75000.0, rows[0].CohortFee)
	assert.Contains(t, rows[0].StudentName, "Test", "student name, not a UUID")

	// Joins stay a separate list: no tutor join exists → empty.
	joins, err := env.svc.ListCohortJoins(ctx, "PENDING")
	require.NoError(t, err)
	assert.Empty(t, joins, "pending student enrolments never appear as tutor joins")
}

func TestUpdateCohortAdmin_GuardsAndSaves(t *testing.T) {
	env := newAdminJoinEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	cohort := &booking.Cohort{ID: uuid.New(), Title: "WAEC Prep", Capacity: 10, EnrolledCount: 5,
		StartDate: time.Now().Add(30 * 24 * time.Hour), EndDate: time.Now().Add(60 * 24 * time.Hour),
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 50000, Currency: "NGN", Status: booking.CohortDraft}
	require.NoError(t, env.store.Cohorts.Create(ctx, cohort))

	// Capacity below enrolled → rejected.
	_, err := env.svc.UpdateCohortAdmin(ctx, admin, cohort.ID, UpdateCohortInput{
		Title: "WAEC Prep", Capacity: 3, StartDate: cohort.StartDate, EndDate: cohort.EndDate,
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 50000, Currency: "NGN",
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// End before start → rejected.
	_, err = env.svc.UpdateCohortAdmin(ctx, admin, cohort.ID, UpdateCohortInput{
		Title: "WAEC Prep", Capacity: 20, StartDate: cohort.EndDate, EndDate: cohort.StartDate,
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 50000, Currency: "NGN",
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Valid edit → saved and lifecycle fields untouched.
	updated, err := env.svc.UpdateCohortAdmin(ctx, admin, cohort.ID, UpdateCohortInput{
		Title: "WAEC Prep (extended)", Capacity: 25, StartDate: cohort.StartDate, EndDate: cohort.EndDate,
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 60000, Currency: "NGN",
	})
	require.NoError(t, err)
	assert.Equal(t, "WAEC Prep (extended)", updated.Title)
	assert.Equal(t, 25, updated.Capacity)
	assert.Equal(t, 60000.0, updated.Fee)
	assert.Equal(t, 5, updated.EnrolledCount, "enrolled count is preserved by the edit")
}
