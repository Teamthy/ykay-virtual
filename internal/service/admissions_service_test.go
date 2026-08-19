package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func newAdmissionsSvc() (*AdmissionsService, *memory.MemoryStore) {
	store := memory.NewMemoryStore()
	svc := NewAdmissionsService(memory.NewMemoryUnitOfWorkFactory(store))
	svc.WithOwnership(func(_ context.Context, _ uuid.UUID) ([]identity.StudentProfile, error) {
		return []identity.StudentProfile{{ID: linkedStudentID}}, nil
	})
	return svc, store
}

var linkedStudentID = uuid.New()

func TestAdmissions_ApplyAndReview(t *testing.T) {
	ctx := context.Background()
	svc, _ := newAdmissionsSvc()
	parent := uuid.New()

	// Apply for the linked learner.
	app, err := svc.Apply(ctx, parent, ApplicationInput{
		StudentProfileID: linkedStudentID,
		ApplicantName:    "Ada Lovelace",
		CurrentLevel:     "Year 9",
		PreferredTerm:    "Autumn 2026",
	})
	require.NoError(t, err)
	require.Equal(t, admissions.StatusPending, app.Status)

	// Owner sees it in their list.
	mine, err := svc.ListMine(ctx, parent)
	require.NoError(t, err)
	require.Len(t, mine, 1)

	// Admin moves it to OFFERED then ACCEPTED.
	admin := uuid.New()
	offered, err := svc.SetStatus(ctx, admin, app.ID, admissions.StatusOffered)
	require.NoError(t, err)
	require.Equal(t, admissions.StatusOffered, offered.Status)
	accepted, err := svc.SetStatus(ctx, admin, app.ID, admissions.StatusAccepted)
	require.NoError(t, err)
	require.Equal(t, admissions.StatusAccepted, accepted.Status)

	// Final: cannot be reopened.
	_, err = svc.SetStatus(ctx, admin, app.ID, admissions.StatusWithdrawn)
	require.Error(t, err)

	// Admin queue reflects the status.
	_, total, err := svc.ListQueue(ctx, "ACCEPTED", 1, 20)
	require.NoError(t, err)
	require.Equal(t, int64(1), total)
}

func TestAdmissions_NotOwnerForbidden(t *testing.T) {
	ctx := context.Background()
	svc, _ := newAdmissionsSvc()
	// A learner the parent does not own (the resolver only links linkedStudentID).
	_, err := svc.Apply(ctx, uuid.New(), ApplicationInput{StudentProfileID: uuid.New()})
	require.ErrorIs(t, err, domain.ErrForbidden)
}
