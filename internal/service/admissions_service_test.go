package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/booking"
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
	offered, err := svc.SetStatus(ctx, admin, app.ID, admissions.StatusOffered, nil)
	require.NoError(t, err)
	require.Equal(t, admissions.StatusOffered, offered.Status)
	accepted, err := svc.SetStatus(ctx, admin, app.ID, admissions.StatusAccepted, nil)
	require.NoError(t, err)
	require.Equal(t, admissions.StatusAccepted, accepted.Status)

	// Final: cannot be reopened.
	_, err = svc.SetStatus(ctx, admin, app.ID, admissions.StatusWithdrawn, nil)
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

func TestAdmissions_OfferAndAccept_WithFee(t *testing.T) {
	ctx := context.Background()
	svc, store := newAdmissionsSvc()
	parent := uuid.New()
	admin := uuid.New()

	// Create a cohort so accept can auto-enrol.
	cohortID := uuid.New()
	store.Cohorts.Seed(&booking.Cohort{
		ID: cohortID, ProgrammeID: uuid.New(), Title: "Admission Cohort", Slug: "admission-cohort",
		Capacity: 20, StartDate: time.Now(), EndDate: time.Now().AddDate(0, 3, 0),
		Timezone: "Africa/Lagos", LocationMode: "ONLINE", Fee: 0, Currency: "NGN",
		Status: booking.CohortPublished,
	})

	app, err := svc.Apply(ctx, parent, ApplicationInput{
		StudentProfileID: linkedStudentID,
		ApplicantName:    "Grace Hopper",
		InstitutionID:    nil,
		ProgrammeID:      nil,
		CohortID:         &cohortID,
	})
	require.NoError(t, err)

	// Offer with a fee.
	fee := 50000.0
	currency := "NGN"
	message := "Welcome!"
	offered, err := svc.SetStatus(ctx, admin, app.ID, admissions.StatusOffered, &OfferInput{Fee: &fee, Currency: &currency, Message: &message})
	require.NoError(t, err)
	require.Equal(t, admissions.StatusOffered, offered.Status)
	require.NotNil(t, offered.OfferFee)
	require.Equal(t, 50000.0, *offered.OfferFee)

	// Accept (parent) → order + enrollment + seat.
	res, err := svc.Accept(ctx, parent, app.ID)
	require.NoError(t, err)
	require.Equal(t, admissions.StatusAccepted, res.Application.Status)
	require.NotNil(t, res.Order)
	require.Equal(t, 50000.0, res.Order.Subtotal)
	require.Equal(t, "NGN", res.Order.Currency)

	// Cannot accept twice.
	_, err = svc.Accept(ctx, parent, app.ID)
	require.Error(t, err)

	// Queue shows accepted.
	_, total, _ := svc.ListQueue(ctx, "ACCEPTED", 1, 20)
	require.Equal(t, int64(1), total)
}

func TestAdmissions_Documents(t *testing.T) {
	ctx := context.Background()
	svc, _ := newAdmissionsSvc()
	parent := uuid.New()

	app, err := svc.Apply(ctx, parent, ApplicationInput{StudentProfileID: linkedStudentID, ApplicantName: "Katherine Johnson"})
	require.NoError(t, err)

	// Parent attaches a document.
	doc, err := svc.AddDocument(ctx, parent, app.ID, "Birth certificate", "https://cdn.virtual.ykaycollege.com/docs/birth.pdf", "application/pdf", 1200)
	require.NoError(t, err)
	require.Equal(t, "Birth certificate", doc.Name)

	// Parent lists them.
	docs, err := svc.ListMyDocuments(ctx, parent, app.ID)
	require.NoError(t, err)
	require.Len(t, docs, 1)

	// A different parent cannot attach/list.
	_, err = svc.AddDocument(ctx, uuid.New(), app.ID, "Evil", "https://x", "", 0)
	require.ErrorIs(t, err, domain.ErrForbidden)

	// Admin can read them.
	adminDocs, err := svc.ListDocuments(ctx, app.ID)
	require.NoError(t, err)
	require.Len(t, adminDocs, 1)

	// Parent removes it.
	err = svc.RemoveMyDocument(ctx, parent, app.ID, doc.ID)
	require.NoError(t, err)
	docs, _ = svc.ListMyDocuments(ctx, parent, app.ID)
	require.Len(t, docs, 0)
}
