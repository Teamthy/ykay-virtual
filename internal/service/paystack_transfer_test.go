package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeTransferProvider — scripted transfer seam for orchestration tests.
type fakeTransferProvider struct {
	recipientCode string
	initiate      payment_provider.TransferResult
	finalize      payment_provider.TransferResult
	recipientErr  error
	initiateErr   error
	finalizeErr   error

	recipientCalls int
	initiateCalls  int
	finalizeCalls  int
	lastOTP        string
}

func (f *fakeTransferProvider) CreateTransferRecipient(_ context.Context, in payment_provider.TransferRecipientInput) (string, error) {
	f.recipientCalls++
	if f.recipientErr != nil {
		return "", f.recipientErr
	}
	return f.recipientCode, nil
}

func (f *fakeTransferProvider) InitiateTransfer(_ context.Context, amount float64, currency, recipientCode, reference, reason string) (payment_provider.TransferResult, error) {
	f.initiateCalls++
	if f.initiateErr != nil {
		return payment_provider.TransferResult{Status: payment_provider.TransferFailed}, f.initiateErr
	}
	return f.initiate, nil
}

func (f *fakeTransferProvider) FinalizeTransfer(_ context.Context, transferCode, otp string) (payment_provider.TransferResult, error) {
	f.finalizeCalls++
	f.lastOTP = otp
	if f.finalizeErr != nil {
		return payment_provider.TransferResult{Status: payment_provider.TransferFailed}, f.finalizeErr
	}
	return f.finalize, nil
}

func newTransferEnv(t *testing.T) (*AdminService, *memory.MemoryStore, uuid.UUID, uuid.UUID, *payment.Payout) {
	t.Helper()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		audit,
	).WithPayments(store.Orders, store.Payouts).
		WithTutors(store.Tutors).
		WithVetting(store.Vetting).
		WithUsers(store.Users, store.Roles)

	now := time.Now().UTC()
	tutorUser := &identity.User{
		ID: uuid.New(), Email: "tutor@test.com", FirstName: "Tunde", LastName: "Ade",
		Status: identity.UserStatusActive, EmailVerifiedAt: &now, CreatedAt: now,
	}
	require.NoError(t, store.Users.Create(context.Background(), tutorUser))

	bankName, bankCode, accNum, accName := "GTBank", "058", "0123456789", "Tunde Ade"
	tp := &tutor.TutorProfile{
		ID: uuid.New(), UserID: tutorUser.ID, Slug: "tutor-transfer",
		DisplayName: "Tunde Ade", Status: tutor.TutorStatusApproved,
		BankName: &bankName, BankCode: &bankCode, AccountNumber: &accNum, AccountName: &accName,
	}
	store.Vetting.SeedProfile(tp)
	// AdminService resolves tutors through the tutor read model — mirror the
	// production search index like the E2E suite does.
	store.Tutors.Seed(tutor.TutorSearchResult{Profile: *tp})

	p := &payment.Payout{
		ID: uuid.New(), TutorProfileID: tp.ID, EscrowHoldID: uuid.New(),
		Amount: 30000, Currency: "NGN", Status: payment.PayoutPending,
	}
	require.NoError(t, store.Payouts.Create(context.Background(), p))

	admin := uuid.New()
	return svc, store, admin, tp.ID, p
}

func TestPayoutViaPaystack_ImmediateSuccess(t *testing.T) {
	svc, store, admin, tpID, p := newTransferEnv(t)
	fake := &fakeTransferProvider{
		recipientCode: "RCP_x",
		initiate:      payment_provider.TransferResult{Status: payment_provider.TransferSuccess, TransferCode: "TRF_y"},
	}
	svc.WithTransferProvider(fake)

	needsOTP, err := svc.PayoutViaPaystack(context.Background(), admin, p.ID)
	require.NoError(t, err)
	assert.False(t, needsOTP)
	assert.Equal(t, 1, fake.recipientCalls)
	assert.Equal(t, 1, fake.initiateCalls)

	got, err := store.Payouts.GetByID(context.Background(), p.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPaid, got.Status)
	require.NotNil(t, got.ProviderReference)
	assert.Equal(t, "TRF_y", *got.ProviderReference)

	// Recipient code cached on the profile for the next payout.
	tp, err := store.Vetting.GetProfileByID(context.Background(), tpID)
	require.NoError(t, err)
	require.NotNil(t, tp.PaystackRecipientCode)
	assert.Equal(t, "RCP_x", *tp.PaystackRecipientCode)
}

func TestPayoutViaPaystack_OTPThenFinalize(t *testing.T) {
	svc, store, admin, _, p := newTransferEnv(t)
	fake := &fakeTransferProvider{
		recipientCode: "RCP_x",
		initiate:      payment_provider.TransferResult{Status: payment_provider.TransferOTP, TransferCode: "TRF_otp"},
		finalize:      payment_provider.TransferResult{Status: payment_provider.TransferSuccess, TransferCode: "TRF_otp"},
	}
	svc.WithTransferProvider(fake)

	needsOTP, err := svc.PayoutViaPaystack(context.Background(), admin, p.ID)
	require.NoError(t, err)
	assert.True(t, needsOTP)

	got, err := store.Payouts.GetByID(context.Background(), p.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPending, got.Status)
	assert.True(t, got.OTPRequired)
	require.NotNil(t, got.TransferCode)
	assert.Equal(t, "TRF_otp", *got.TransferCode)

	// Re-initiate while OTP is pending → returns needs_otp without a second
	// provider call.
	needsOTP, err = svc.PayoutViaPaystack(context.Background(), admin, p.ID)
	require.NoError(t, err)
	assert.True(t, needsOTP)
	assert.Equal(t, 1, fake.initiateCalls)

	// Finalize with the OTP.
	done, err := svc.CompletePaystackTransfer(context.Background(), admin, p.ID, "123456")
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPaid, done.Status)
	assert.Equal(t, "123456", fake.lastOTP)

	// Double finalize rejected.
	_, err = svc.CompletePaystackTransfer(context.Background(), admin, p.ID, "123456")
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestPayoutViaPaystack_MissingBankCode(t *testing.T) {
	svc, store, admin, tpID, p := newTransferEnv(t)
	// Replace the tutor's profile (in BOTH stores the service reads) with one
	// that lacks the bank code — Paystack requires it.
	bankName, accNum, accName := "GTBank", "0123456789", "Tunde Ade"
	noCode := &tutor.TutorProfile{
		ID: tpID, UserID: uuid.New(), Slug: "tutor-nocode",
		DisplayName: "No Code", Status: tutor.TutorStatusApproved,
		BankName: &bankName, AccountNumber: &accNum, AccountName: &accName,
	}
	store.Vetting.SeedProfile(noCode)
	store.Tutors.Seed(tutor.TutorSearchResult{Profile: *noCode})
	fake := &fakeTransferProvider{recipientCode: "RCP_x"}
	svc.WithTransferProvider(fake)

	_, err := svc.PayoutViaPaystack(context.Background(), admin, p.ID)
	assert.ErrorIs(t, err, domain.ErrConflict)
	assert.Equal(t, 0, fake.recipientCalls, "must not call the provider without bank details")
}

func TestPayoutViaPaystack_Disabled(t *testing.T) {
	svc, _, admin, _, p := newTransferEnv(t)
	// No transfer provider wired.
	_, err := svc.PayoutViaPaystack(context.Background(), admin, p.ID)
	assert.ErrorIs(t, err, domain.ErrConflict)
	assert.False(t, svc.TransfersEnabled())
}
