package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// FR-25 — enrolment windows: the time-based gate on cohort enrolment.

func TestEnrollmentWindow_DefaultsOpenUntilEndDate(t *testing.T) {
	now := time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)
	c := &booking.Cohort{
		Status: booking.CohortPublished, Capacity: 10, EnrolledCount: 0,
		StartDate: now.AddDate(0, 0, -7), EndDate: now.AddDate(0, 2, 0),
	}
	// No explicit window: open (mid-cohort join allowed until end_date).
	assert.True(t, c.CanEnrollAt(now))

	// After the cohort ends: closed.
	assert.False(t, c.CanEnrollAt(c.EndDate.Add(time.Hour)))
}

func TestEnrollmentWindow_OpensAndCloses(t *testing.T) {
	now := time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)
	opens := now.Add(24 * time.Hour)
	closes := now.Add(72 * time.Hour)
	c := &booking.Cohort{
		Status: booking.CohortPublished, Capacity: 10,
		StartDate: now.AddDate(0, 0, 10), EndDate: now.AddDate(0, 3, 0),
		EnrollmentOpensAt: &opens, EnrollmentClosesAt: &closes,
	}
	assert.False(t, c.CanEnrollAt(now), "before opens_at must be closed")
	assert.True(t, c.CanEnrollAt(opens.Add(time.Hour)), "inside window must be open")
	assert.False(t, c.CanEnrollAt(closes.Add(time.Hour)), "after closes_at must be closed")
}

func TestCreateCohortBooking_RejectsClosedWindow(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	// Close the window in the past on the seeded cohort.
	c, err := env.store.Cohorts.GetByID(ctx, env.cohort)
	require.NoError(t, err)
	closed := time.Now().UTC().Add(-48 * time.Hour)
	c.EnrollmentClosesAt = &closed
	env.store.Cohorts.Seed(c)

	_, err = env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "window-closed",
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrConflict)
	assert.Contains(t, err.Error(), "closed")

	// No seat consumed by the rejected attempt.
	c2, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 0, c2.EnrolledCount)
}

func TestCreateCohortBooking_AllowsInsideWindow(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	c, err := env.store.Cohorts.GetByID(ctx, env.cohort)
	require.NoError(t, err)
	opens := time.Now().UTC().Add(-time.Hour)
	closes := time.Now().UTC().Add(24 * time.Hour)
	c.EnrollmentOpensAt = &opens
	c.EnrollmentClosesAt = &closes
	env.store.Cohorts.Seed(c)

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "window-open",
	})
	require.NoError(t, err)
	assert.NotNil(t, res.EnrollmentID)
}
