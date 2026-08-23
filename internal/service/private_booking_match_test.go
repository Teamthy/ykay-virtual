package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain/booking"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Self-serve private booking: the learner picked the tutor themselves, so the
// request must be born MATCHED with the tutor recorded — it must never sit in
// the admin "awaiting match" queue.
func TestCreatePrivateBooking_RequestBornMatched(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreatePrivateBooking(ctx, CreatePrivateBookingInput{
		ParentUserID:    env.parent,
		StudentID:       env.student,
		TutorProfileID:  env.tutor,
		SubjectID:       env.subject,
		TotalSessions:   8,
		SessionDuration: 60,
		IdempotencyKey:  "private-matched-1",
	})
	require.NoError(t, err)
	require.NotNil(t, res.PackageID)

	pkg, err := env.store.PrivatePkgs.GetByID(ctx, *res.PackageID)
	require.NoError(t, err)
	assert.Equal(t, booking.PrivatePackagePendingPayment, pkg.Status, "YK-004: package must not be active before payment")

	req, err := env.store.PrivateReqs.GetByID(ctx, pkg.RequestID)
	require.NoError(t, err)
	assert.Equal(t, booking.PrivateMatched, req.Status)
	require.NotNil(t, req.MatchedTutorID)
	assert.Equal(t, env.tutor, *req.MatchedTutorID)
}
