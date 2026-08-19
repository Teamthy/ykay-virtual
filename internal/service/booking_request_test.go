package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// TestPrivateTuitionRequestMatch covers the request → match → payable order
// journey: a request is created PENDING with no tutor, then an admin match
// creates a PENDING_PAYMENT package + PENDING order the parent can pay.
func TestPrivateTuitionRequestMatch(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	// 1) Parent requests to be matched (no tutor chosen).
	req, err := env.booking.CreatePrivateTuitionRequest(ctx, CreatePrivateRequestInput{
		ParentUserID: env.parent,
		StudentID:    env.student,
		SubjectID:    env.subject,
		Goals:        "Prepare for UTME",
	})
	require.NoError(t, err)
	require.Equal(t, booking.PrivatePending, req.Status)
	require.Nil(t, req.MatchedTutorID)

	// 2) Admin matches a vetted tutor → payable package + order.
	admin := uuid.New()
	res, err := env.booking.MatchPrivateTuitionRequest(ctx, admin, req.ID, env.tutor, 10, 60)
	require.NoError(t, err)
	require.NotNil(t, res.Package)
	require.NotNil(t, res.Order)
	require.Equal(t, booking.PrivatePackagePendingPayment, res.Package.Status)
	require.Equal(t, payment.OrderPending, res.Order.Status)
	require.Equal(t, booking.PrivateMatched, res.Request.Status)
	require.NotNil(t, res.Request.MatchedTutorID)
	require.Equal(t, env.tutor, *res.Request.MatchedTutorID)

	// Package belongs to the request and carries the tutor's published rate.
	require.Equal(t, req.ID, res.Package.RequestID)
	require.Equal(t, env.tutor, res.Package.TutorProfileID)
	require.Equal(t, 10, res.Package.TotalSessions)
	require.Equal(t, float64(8000*10), res.Package.TotalPrice)

	// 3) The parent can read it back.
	got, err := env.booking.GetPrivateTuitionRequest(ctx, env.parent, req.ID, false)
	require.NoError(t, err)
	require.Equal(t, booking.PrivateMatched, got.Status)

	// 4) A non-owner is forbidden.
	other := uuid.New()
	_, err = env.booking.GetPrivateTuitionRequest(ctx, other, req.ID, false)
	require.Error(t, err)
}

// TestPrivateTuitionRequest_InvalidSessionCount guards the match validation.
func TestPrivateTuitionRequest_InvalidSessionCount(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	req, err := env.booking.CreatePrivateTuitionRequest(ctx, CreatePrivateRequestInput{
		ParentUserID: env.parent, StudentID: env.student, SubjectID: env.subject,
	})
	require.NoError(t, err)

	_, err = env.booking.MatchPrivateTuitionRequest(ctx, uuid.New(), req.ID, env.tutor, 0, 60)
	require.Error(t, err)
}
