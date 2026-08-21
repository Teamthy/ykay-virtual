package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/storage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Bank details ──────────────────────────────────────────────────────────

func TestUpdateBankDetails_SaveClearValidate(t *testing.T) {
	t.Setenv("YKAY_STORAGE_SECRET", "nuvora-test-secret")
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewVettingService(
		memory.NewMemoryUnitOfWorkFactory(store),
		storage.NewLocalStorage(),
		NewAuditService(store.AuditLogs),
		SubjectReaderAdapter{},
		&fakeInvalidator{},
	)
	actor := uuid.New()
	p, err := svc.CreateProfile(ctx, actor, CreateProfileInput{DisplayName: "Bank Tutor", YearsExperience: 3})
	require.NoError(t, err)

	// Validation: account number must be digits.
	err = svc.UpdateBankDetails(ctx, actor, p.ID, "GTBank", "058", "0123ABC456", "Bank Tutor")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Partial update rejected.
	err = svc.UpdateBankDetails(ctx, actor, p.ID, "GTBank", "058", "0123456789", "")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Save.
	err = svc.UpdateBankDetails(ctx, actor, p.ID, "GTBank", "058", "0123456789", "Bank Tutor")
	require.NoError(t, err)
	got, err := store.Vetting.GetProfileByID(ctx, p.ID)
	require.NoError(t, err)
	require.NotNil(t, got.BankName)
	assert.Equal(t, "GTBank", *got.BankName)
	require.NotNil(t, got.AccountNumber)
	assert.Equal(t, "0123456789", *got.AccountNumber)

	// Owner-only: a different user cannot change it.
	other := uuid.New()
	err = svc.UpdateBankDetails(ctx, other, p.ID, "Zenith", "057", "9876543210", "Hacker")
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// Clear with all-empty.
	err = svc.UpdateBankDetails(ctx, actor, p.ID, "", "", "", "")
	require.NoError(t, err)
	got, err = store.Vetting.GetProfileByID(ctx, p.ID)
	require.NoError(t, err)
	assert.Nil(t, got.BankName)
	assert.Nil(t, got.AccountNumber)
}

// ── Payout confirmation (bank transfer) ───────────────────────────────────

func TestConfirmBankPayout_ManualBankTransfer(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewPayoutService(memory.NewMemoryUnitOfWorkFactory(store), NewAuditService(store.AuditLogs), time.Now)

	p := &payment.Payout{
		ID: uuid.New(), TutorProfileID: uuid.New(), EscrowHoldID: uuid.New(),
		Amount: 31500, Currency: "NGN", Status: payment.PayoutPending,
	}
	require.NoError(t, store.Payouts.Create(ctx, p))

	admin := uuid.New()
	// Reference required.
	_, err := svc.ConfirmBankPayout(ctx, admin, p.ID, "  ")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	confirmed, err := svc.ConfirmBankPayout(ctx, admin, p.ID, "TRF-20260820-001")
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPaid, confirmed.Status)
	require.NotNil(t, confirmed.ProviderReference)
	assert.Equal(t, "TRF-20260820-001", *confirmed.ProviderReference)
	assert.NotNil(t, confirmed.ProcessedAt)

	// Double confirmation rejected.
	_, err = svc.ConfirmBankPayout(ctx, admin, p.ID, "TRF-20260820-002")
	assert.ErrorIs(t, err, domain.ErrConflict)
}

// ── Messaging contacts + scoped cohort conversation ───────────────────────

func newMessagingEnv(t *testing.T) (*MessagingService, *memory.MemoryStore, uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID) {
	t.Helper()
	store := memory.NewMemoryStore()
	convMem := memory.NewConversationMemory()
	svc := NewMessagingService(
		convMem, memory.NewMessageMemory(convMem), memory.NewNotificationMemory(),
		store.PrivatePkgs, store.Cohorts, nil,
	).WithContactDeps(store.Vetting, store.Enrollments, store.Students, store.Users)

	tutorUser := uuid.New()
	parentUser := uuid.New()
	tutorProfile := &tutor.TutorProfile{
		ID: uuid.New(), UserID: tutorUser, Slug: "tutor-x", DisplayName: "Ms. Tutor",
		Status: tutor.TutorStatusApproved,
	}
	store.Vetting.SeedProfile(tutorProfile)

	cohort := &booking.Cohort{
		ID: uuid.New(), Title: "IGCSE Maths — Sept", Slug: "igcse-sept",
		TutorProfileID: &tutorProfile.ID, Status: booking.CohortPublished, Capacity: 10,
	}
	store.Cohorts.Seed(cohort)

	student := &identity.StudentProfile{
		ID: uuid.New(), FirstName: "Kemi", LastName: "Ade", GuardianConsent: true,
	}
	require.NoError(t, store.Students.Create(context.Background(), student))
	require.NoError(t, store.StudentLinks.Create(context.Background(), &identity.ParentStudentLink{
		ID: uuid.New(), ParentUserID: parentUser, StudentProfileID: student.ID, Relationship: "PARENT",
	}))

	enrollment := &booking.CohortEnrollment{
		ID: uuid.New(), CohortID: cohort.ID, StudentProfileID: student.ID,
		ParentUserID: parentUser, Status: booking.EnrollmentConfirmed,
	}
	require.NoError(t, store.Enrollments.Create(context.Background(), enrollment))

	return svc, store, tutorUser, parentUser, tutorProfile.ID, cohort.ID
}

func TestMessagingContacts_TutorSeesLearner(t *testing.T) {
	svc, _, tutorUser, parentUser, _, cohortID := newMessagingEnv(t)
	ctx := context.Background()

	rows, err := svc.Contacts(ctx, tutorUser)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, parentUser, rows[0].UserID)
	assert.Equal(t, "PARENT", rows[0].Role)
	assert.Equal(t, cohortID, *rows[0].CohortID)
}

func TestMessagingContacts_ParentSeesTutor(t *testing.T) {
	svc, _, tutorUser, parentUser, _, cohortID := newMessagingEnv(t)
	ctx := context.Background()

	rows, err := svc.Contacts(ctx, parentUser)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, tutorUser, rows[0].UserID)
	assert.Equal(t, "TUTOR", rows[0].Role)
	assert.Equal(t, cohortID, *rows[0].CohortID)
}

func TestStartCohortConversation_AuthzAndParticipants(t *testing.T) {
	svc, _, tutorUser, parentUser, _, cohortID := newMessagingEnv(t)
	ctx := context.Background()

	// Stranger cannot start it.
	_, err := svc.StartCohortConversation(ctx, uuid.New(), cohortID)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// Parent starts it — participants derived server-side.
	conv, err := svc.StartCohortConversation(ctx, parentUser, cohortID)
	require.NoError(t, err)
	require.NotNil(t, conv)

	// Tutor is a participant (derived, not client-supplied).
	participants, err := svc.conversations.ListParticipants(ctx, conv.ID)
	require.NoError(t, err)
	ids := map[uuid.UUID]bool{}
	for _, p := range participants {
		ids[p.UserID] = true
	}
	assert.True(t, ids[tutorUser], "tutor must be a participant")
	assert.True(t, ids[parentUser], "parent must be a participant")

	// Idempotent: tutor "starts" it again → same conversation.
	again, err := svc.StartCohortConversation(ctx, tutorUser, cohortID)
	require.NoError(t, err)
	assert.Equal(t, conv.ID, again.ID)
}
