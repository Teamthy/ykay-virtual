package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Phase 3 — self-enrollment + minor (<17) gating.

func seedProfile(t *testing.T, store *memory.MemoryStore, userID uuid.UUID, dob *time.Time) uuid.UUID {
	t.Helper()
	id := uuid.New()
	require.NoError(t, store.Students.Create(context.Background(), &identity.StudentProfile{
		ID: id, UserID: &userID, FirstName: "Self", LastName: "Learner",
		DateOfBirth: dob, Timezone: "Africa/Lagos",
	}))
	return id
}

func TestAuthorizeEnrollment_ParentLinkedChild(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	err := env.booking.authorizeEnrollment(ctx, env.student, env.parent)
	assert.NoError(t, err)
}

func TestAuthorizeEnrollment_SelfAdult(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	learner := uuid.New()
	dob := time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	pid := seedProfile(t, env.store, learner, &dob)

	// The learner IS the actor and is 26 → self-enrollment allowed.
	err := env.booking.authorizeEnrollment(ctx, pid, learner)
	assert.NoError(t, err)
}

func TestAuthorizeEnrollment_SelfMinorNoGuardian_Forbidden(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	learner := uuid.New()
	dob := time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC) // 11 years old
	pid := seedProfile(t, env.store, learner, &dob)

	err := env.booking.authorizeEnrollment(ctx, pid, learner)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestAuthorizeEnrollment_SelfMinorWithGuardian_Allowed(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	learner := uuid.New()
	dob := time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC)
	pid := seedProfile(t, env.store, learner, &dob)

	// A guardian links to the minor's profile → allowed.
	require.NoError(t, env.store.StudentLinks.Create(ctx, &identity.ParentStudentLink{
		ParentUserID: env.parent, StudentProfileID: pid, Relationship: "PARENT", IsPrimary: true,
	}))
	err := env.booking.authorizeEnrollment(ctx, pid, learner)
	assert.NoError(t, err)
}

func TestAuthorizeEnrollment_UnrelatedActor_Forbidden(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	err := env.booking.authorizeEnrollment(ctx, env.student, uuid.New())
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestCreateCohortBooking_SelfEnrollmentMinorBlocked(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	learner := uuid.New()
	dob := time.Date(2014, 6, 1, 0, 0, 0, 0, time.UTC)
	pid := seedProfile(t, env.store, learner, &dob)

	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: learner, StudentID: pid,
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// capacity unchanged
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 0, c.EnrolledCount)
}

func TestCreateCohortBooking_SelfEnrollmentAdultSucceeds(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	learner := uuid.New()
	dob := time.Date(2003, 3, 1, 0, 0, 0, 0, time.UTC)
	pid := seedProfile(t, env.store, learner, &dob)

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: learner, StudentID: pid, IdempotencyKey: "self-adult",
	})
	require.NoError(t, err)
	assert.NotNil(t, res.EnrollmentID)
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount)
}
