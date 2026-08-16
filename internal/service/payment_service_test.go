package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const paystackSecret = "test-secret"

// seedOrderAndPayment creates a PENDING order + PENDING payment row directly
// through the memory store, mimicking what InitiatePayment does.
func seedOrderAndPayment(t *testing.T, env *testEnv, reference string) (uuid.UUID, uuid.UUID) {
	t.Helper()
	order := &payment.Order{
		ParentUserID: env.parent, StudentID: &env.student,
		Status: payment.OrderPending, Subtotal: 75000, TotalAmount: 75000, Currency: "NGN",
	}
	require.NoError(t, env.store.Orders.Create(context.Background(), order))

	desc := "Cohort enrollment"
	item := &payment.OrderItem{
		OrderID: order.ID, ItemType: "COHORT", ReferenceID: env.cohort,
		Description: &desc, Quantity: 1, UnitPrice: 75000, TotalPrice: 75000,
	}
	require.NoError(t, env.store.Orders.CreateItem(context.Background(), item))

	enr := &booking.CohortEnrollment{
		CohortID: env.cohort, StudentProfileID: env.student, ParentUserID: env.parent,
		OrderID: &order.ID, Status: booking.EnrollmentPending,
	}
	require.NoError(t, env.store.Enrollments.Create(context.Background(), enr))

	p := &payment.Payment{
		OrderID: order.ID, Provider: payment.ProviderPaystack,
		ProviderReference: &reference, Amount: 75000, Currency: "NGN",
		Status: payment.PaymentPending,
	}
	require.NoError(t, env.store.Payments.Create(context.Background(), p))
	// Wallet is created at booking time in the real flow.
	_, err := env.store.Wallets.GetOrCreate(context.Background(), env.parent, "NGN")
	require.NoError(t, err)
	return order.ID, p.ID
}

func paystackWebhook(reference string, amountKobo int) []byte {
	body, _ := json.Marshal(map[string]any{
		"event": "charge.success",
		"data": map[string]any{
			"reference": reference,
			"amount":    amountKobo,
			"status":    "success",
		},
	})
	return body
}

func TestProcessWebhook_ValidSignature_Success(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-ABCD1234"
	orderID, paymentID := seedOrderAndPayment(t, env, ref)

	payload := paystackWebhook(ref, 7_500_000) // 75000.00 NGN in kobo
	res, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res.Processed)
	assert.Equal(t, paymentID, *res.PaymentID)

	// Payment SUCCESS + paid_at
	p, err := env.store.Payments.GetByID(ctx, paymentID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentSuccess, p.Status)
	require.NotNil(t, p.PaidAt)

	// Order PAID
	o, err := env.store.Orders.GetByID(ctx, orderID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)

	// Enrollment CONFIRMED
	enr, err := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	require.NoError(t, err)
	assert.Equal(t, booking.EnrollmentConfirmed, enr.Status)

	// Escrow HELD for the tutor with release_at = now + 72h
	holds, err := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	require.Len(t, holds, 1)
	assert.Equal(t, payment.EscrowHeld, holds[0].Status)
	assert.Equal(t, env.tutor, holds[0].TutorProfileID)
	assert.Equal(t, 75000.0, holds[0].Amount)
	require.NotNil(t, holds[0].ReleaseAt)
	assert.WithinDuration(t, fixedTime.Add(72*time.Hour), *holds[0].ReleaseAt, time.Minute)

	// Webhook row recorded + processed
	w, err := env.store.Webhooks.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	require.NoError(t, err)
	assert.True(t, w.SignatureValid)
	assert.True(t, w.Processed)

	// Audit trail for order status change
	logs, err := env.store.AuditLogs.ListByTarget(ctx, "order", orderID, 10)
	require.NoError(t, err)
	assert.NotEmpty(t, logs)
}

func TestProcessWebhook_DuplicateDelivery_Idempotent(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-DUP00001"
	orderID, paymentID := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)

	first, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, first.Processed)

	// Provider retries the exact same delivery → acknowledged, no double work.
	second, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, second.Duplicate)
	assert.True(t, second.Processed)

	// State unchanged: still exactly one SUCCESS payment, one PAID order.
	p, _ := env.store.Payments.GetByID(ctx, paymentID)
	assert.Equal(t, payment.PaymentSuccess, p.Status)
	o, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPaid, o.Status)
	holds, _ := env.store.Escrow.GetByOrderID(ctx, orderID)
	assert.Len(t, holds, 1, "no duplicate escrow holds on duplicate webhook")
}

func TestProcessWebhook_InvalidSignature_Rejected(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-BAD00001"
	seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)

	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		"forged-signature", paystackSecret)
	assert.ErrorIs(t, err, domain.ErrInvalidSignature)

	// Payment NOT mutated
	p, err := env.store.Payments.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentPending, p.Status)

	// Webhook row persisted for forensics with signature_valid=false
	w, err := env.store.Webhooks.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	require.NoError(t, err)
	assert.False(t, w.SignatureValid)
}

func TestProcessWebhook_UnknownReference_Ignored(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-NOMATCH"
	payload := paystackWebhook(ref, 7_500_000)

	res, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res.Ignored)
	assert.Equal(t, "no_matching_payment", res.Reason)
}

func TestProcessWebhook_NonSuccessEvent_Ignored(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-FAILED"
	seedOrderAndPayment(t, env, ref)

	body, _ := json.Marshal(map[string]any{
		"event": "charge.failed",
		"data":  map[string]any{"reference": ref, "status": "failed"},
	})
	res, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, body,
		signPaystack(body, paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res.Ignored)

	p, _ := env.store.Payments.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	assert.Equal(t, payment.PaymentPending, p.Status, "failed event must not mark payment success")
}

func TestProcessWebhook_AmountMismatch_Rejected(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-AMOUNT"
	seedOrderAndPayment(t, env, ref)

	// Paystack sends 1,000,000 kobo (10,000 NGN) but the order is 75,000 NGN.
	payload := paystackWebhook(ref, 1_000_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	assert.Error(t, err)

	p, _ := env.store.Payments.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	assert.Equal(t, payment.PaymentPending, p.Status)
}

func TestInitiatePayment_CreatesPendingPaymentAndLink(t *testing.T) {
	env := newTestEnv(t)
	// Empty secret ⇒ provider returns a mock link instead of calling the API.
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack: payment_provider.NewPaystack(""),
	}
	ctx := context.Background()
	order := &payment.Order{
		ParentUserID: env.parent, StudentID: &env.student,
		Status: payment.OrderPending, Subtotal: 50000, TotalAmount: 50000, Currency: "NGN",
	}
	require.NoError(t, env.store.Orders.Create(ctx, order))

	res, err := env.pay.InitiatePayment(ctx, InitiatePaymentInput{
		OrderID: order.ID, Provider: payment.ProviderPaystack,
		PayerEmail: "parent@example.com",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, res.PaymentLink)
	assert.Equal(t, payment.PaymentPending, res.Payment.Status)
	require.NotNil(t, res.Payment.ProviderReference)
	assert.Contains(t, *res.Payment.ProviderReference, strings.ToUpper(order.OrderNumber))

	// Payment persisted
	p, err := env.store.Payments.GetByID(ctx, res.Payment.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentPending, p.Status)
}

func TestInitiatePayment_RejectsPaidOrder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	order := &payment.Order{
		ParentUserID: env.parent, StudentID: &env.student,
		Status: payment.OrderPaid, Subtotal: 50000, TotalAmount: 50000, Currency: "NGN",
	}
	require.NoError(t, env.store.Orders.Create(ctx, order))

	_, err := env.pay.InitiatePayment(ctx, InitiatePaymentInput{
		OrderID: order.ID, Provider: payment.ProviderPaystack, PayerEmail: "a@b.com",
	})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestReleaseEscrow_CreatesPayout(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-REL001"
	orderID, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)

	holds, _ := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.Len(t, holds, 1)

	// Parent confirms delivery → escrow released + payout PENDING.
	payout, err := env.pay.ReleaseEscrow(ctx, holds[0].ID, ReleaseClientConfirm, &env.parent, nil, nil)
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPending, payout.Status)
	assert.Equal(t, env.tutor, payout.TutorProfileID)
	assert.Equal(t, 75000.0, payout.Amount)

	h, _ := env.store.Escrow.GetByID(ctx, holds[0].ID)
	assert.Equal(t, payment.EscrowReleased, h.Status)

	// Double release rejected (state guard).
	_, err = env.pay.ReleaseEscrow(ctx, holds[0].ID, ReleaseClientConfirm, &env.parent, nil, nil)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestRefundEscrow_CreditsWallet(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-REF001"
	orderID, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)

	holds, _ := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.Len(t, holds, 1)

	err = env.pay.RefundEscrow(ctx, holds[0].ID, &env.parent, "tutor never started", nil, nil)
	require.NoError(t, err)

	h, _ := env.store.Escrow.GetByID(ctx, holds[0].ID)
	assert.Equal(t, payment.EscrowRefunded, h.Status)

	// Wallet credited 75,000 (wallet auto-created at booking).
	w, err := env.store.Wallets.GetByUserID(ctx, env.parent)
	require.NoError(t, err)
	assert.Equal(t, 75000.0, w.Balance)

	o, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderRefunded, o.Status)
}

func TestExpireStaleHolds_ReleasesStale(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	// Fresh hold (release_at in future) — must NOT be released.
	order := &payment.Order{ParentUserID: env.parent, Status: payment.OrderPending, TotalAmount: 1000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, order))
	future := fixedTime.Add(24 * time.Hour)
	hold := &payment.EscrowHold{
		OrderID: order.ID, PaymentID: uuid.New(), TutorProfileID: env.tutor,
		Amount: 1000, Status: payment.EscrowHeld, ReleaseAt: &future,
	}
	require.NoError(t, env.store.Escrow.Create(ctx, hold))

	// Stale hold (release_at in the past) — auto-released by the cron.
	order2 := &payment.Order{ParentUserID: env.parent, Status: payment.OrderPending, TotalAmount: 2000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, order2))
	past := fixedTime.Add(-time.Hour)
	stale := &payment.EscrowHold{
		OrderID: order2.ID, PaymentID: uuid.New(), TutorProfileID: env.tutor,
		Amount: 2000, Status: payment.EscrowHeld, ReleaseAt: &past,
	}
	require.NoError(t, env.store.Escrow.Create(ctx, stale))

	n, err := env.pay.ExpireStaleHolds(ctx, 50)
	require.NoError(t, err)
	assert.Equal(t, 1, n)

	h1, _ := env.store.Escrow.GetByID(ctx, hold.ID)
	assert.Equal(t, payment.EscrowHeld, h1.Status, "future hold untouched")
	h2, _ := env.store.Escrow.GetByID(ctx, stale.ID)
	assert.Equal(t, payment.EscrowReleased, h2.Status, "stale hold auto-released")

	// Payout created for the released hold
	payout, err := env.store.Payouts.GetByEscrowHoldID(ctx, stale.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.PayoutPending, payout.Status)
}

func TestProcessPendingPayouts_PaysPending(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	p1 := &payment.Payout{TutorProfileID: env.tutor, EscrowHoldID: uuid.New(), Amount: 5000, Currency: "NGN", Status: payment.PayoutPending}
	p2 := &payment.Payout{TutorProfileID: env.tutor, EscrowHoldID: uuid.New(), Amount: 7000, Currency: "NGN", Status: payment.PayoutPending}
	require.NoError(t, env.store.Payouts.Create(ctx, p1))
	require.NoError(t, env.store.Payouts.Create(ctx, p2))

	n, err := env.pay.PayoutSvc.ProcessPendingPayouts(ctx, 100)
	require.NoError(t, err)
	assert.Equal(t, 2, n)

	paid, _ := env.store.Payouts.ListByStatus(ctx, payment.PayoutPaid, 100)
	assert.Len(t, paid, 2)
	for _, p := range paid {
		assert.NotNil(t, p.ProviderReference)
		assert.NotNil(t, p.ProcessedAt)
	}

	// Second run: nothing left to pay (idempotent).
	n2, err := env.pay.PayoutSvc.ProcessPendingPayouts(ctx, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n2)
}

// TestPrivatePackage_ActivatesOnlyAfterPayment — YK-004 regression:
// a private-tuition package must start PENDING_PAYMENT (not ACTIVE) and only
// become ACTIVE once its order is settled via webhook.
func TestPrivatePackage_ActivatesOnlyAfterPayment(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	// 1) Create the private booking: package should be PENDING_PAYMENT.
	res, err := env.booking.CreatePrivateBooking(ctx, CreatePrivateBookingInput{
		ParentUserID: env.parent, StudentID: env.student,
		TutorProfileID: env.tutor, SubjectID: env.subject,
		TotalSessions: 10, SessionDuration: 60, PricePerSession: 8000, Currency: "NGN",
	})
	require.NoError(t, err)
	require.NotNil(t, res.PackageID)
	pkg, err := env.store.PrivatePkgs.GetByID(ctx, *res.PackageID)
	require.NoError(t, err)
	assert.Equal(t, booking.PrivatePackagePendingPayment, pkg.Status, "package must not be active before payment")

	// 2) Seed a pending payment for the returned order and settle via webhook.
	ref := "YKAY-PRIVATE-ACTIVATE-001"
	p := &payment.Payment{
		OrderID: res.Order.ID, Provider: payment.ProviderPaystack,
		ProviderReference: &ref, Amount: res.Order.TotalAmount, Currency: res.Order.Currency,
		Status: payment.PaymentPending,
	}
	require.NoError(t, env.store.Payments.Create(ctx, p))

	payload := paystackWebhook(ref, int(res.Order.TotalAmount*100)) // NGN in kobo
	wres, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	require.True(t, wres.Processed)

	// 3) After settlement the package must be ACTIVE.
	after, err := env.store.PrivatePkgs.GetByID(ctx, *res.PackageID)
	require.NoError(t, err)
	assert.Equal(t, booking.PrivatePackageActive, after.Status, "package activates only on payment")
}

// TestReleaseEscrow_ConcurrentNoDoubleSettlement — YK-007 regression: many
// concurrent release attempts on the same hold must yield exactly one payout,
// not one per attempt. The atomic compare-and-set (ReleaseIfHeld) guards it.
func TestReleaseEscrow_ConcurrentNoDoubleSettlement(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260811-RACE1"
	orderID, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	holds, _ := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.Len(t, holds, 1)
	holdID := holds[0].ID

	const attempts = 8
	var wg sync.WaitGroup
	errs := make([]error, attempts)
	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, errs[i] = env.pay.ReleaseEscrow(ctx, holdID, ReleaseClientConfirm, &env.parent, nil, nil)
		}(i)
	}
	wg.Wait()

	// Exactly one release succeeded; the rest were conflict/no-op.
	ok := 0
	for _, e := range errs {
		if e == nil {
			ok++
		} else if !errors.Is(e, domain.ErrConflict) {
			t.Fatalf("unexpected error: %v", e)
		}
	}
	assert.Equal(t, 1, ok, "exactly one concurrent release should succeed")

	// Exactly one payout row exists for the hold.
	payments, _ := env.store.Payouts.GetByEscrowHoldID(ctx, holdID)
	_ = payments
	payouts, err := env.store.Payouts.ListByStatus(ctx, payment.PayoutPending, 100)
	require.NoError(t, err)
	related := 0
	for _, p := range payouts {
		if p.EscrowHoldID == holdID {
			related++
		}
	}
	assert.Equal(t, 1, related, "exactly one payout per escrow hold")
}
