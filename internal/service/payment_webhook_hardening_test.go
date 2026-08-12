package service

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Webhook hardening (phase 23): the replay/edge cases the crons rely on ──

// Malformed JSON payloads are rejected before any state is touched.
func TestProcessWebhook_MalformedPayload_Rejected(t *testing.T) {
	env := newTestEnv(t)
	_, err := env.pay.ProcessWebhook(context.Background(), payment.ProviderPaystack,
		[]byte("{not json"), "", paystackSecret)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// Payloads with no reference (neither paystack reference nor flutterwave
// tx_ref) are rejected.
func TestProcessWebhook_NoReference_Rejected(t *testing.T) {
	env := newTestEnv(t)
	body, _ := json.Marshal(map[string]any{"event": "charge.success", "data": map[string]any{"amount": 100}})
	_, err := env.pay.ProcessWebhook(context.Background(), payment.ProviderPaystack, body, "", paystackSecret)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// Unsupported providers are rejected up-front.
func TestProcessWebhook_UnsupportedProvider_Rejected(t *testing.T) {
	env := newTestEnv(t)
	body, _ := json.Marshal(map[string]any{"event": "charge.success", "data": map[string]any{"reference": "X"}})
	_, err := env.pay.ProcessWebhook(context.Background(), "STRIPE", body, "", paystackSecret)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// A duplicate delivery of an UNPROCESSED webhook (crash between insert and
// processing) continues processing instead of erroring or double-charging.
// We simulate the crash by pre-seeding the webhook row unprocessed — the
// service must detect it, adopt it and finish the flow.
func TestProcessWebhook_UnprocessedDuplicate_ContinuesProcessing(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260812-REPLAY99"
	orderID, paymentID := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	sig := signPaystack(payload, paystackSecret)

	// Simulate a crash after the webhook row was inserted but before the
	// order/payment state was updated.
	pre := &payment.PaymentWebhook{
		Provider: payment.ProviderPaystack, ProviderReference: ref,
		Payload: string(payload), SignatureValid: true, Processed: false,
	}
	require.NoError(t, env.store.Webhooks.Create(ctx, pre))

	// Replay → processed (not a duplicate), idempotently.
	res, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload, sig, paystackSecret)
	require.NoError(t, err)
	assert.True(t, res.Processed)

	p, err := env.store.Payments.GetByID(ctx, paymentID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentSuccess, p.Status)

	o, err := env.store.Orders.GetByID(ctx, orderID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)

	// Exactly one payment row (no duplicate charge records).
	rows, err := env.store.Payments.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, rows, 1)
}

// A fully processed replay short-circuits with duplicate=true and touches
// nothing — the guard the worker's idempotent processing relies on.
func TestProcessWebhook_ProcessedReplay_ShortCircuits(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "YKAY-20260812-REPLAY88"
	orderID, paymentID := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	sig := signPaystack(payload, paystackSecret)

	res1, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload, sig, paystackSecret)
	require.NoError(t, err)
	assert.True(t, res1.Processed)
	assert.False(t, res1.Duplicate)

	// Replay the exact same delivery.
	res2, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload, sig, paystackSecret)
	require.NoError(t, err)
	assert.True(t, res2.Processed)
	assert.True(t, res2.Duplicate)
	assert.Equal(t, "already_processed", res2.Reason)

	// State unchanged and single rows everywhere.
	p, err := env.store.Payments.GetByID(ctx, paymentID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentSuccess, p.Status)
	o, err := env.store.Orders.GetByID(ctx, orderID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)
	rows, err := env.store.Payments.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, rows, 1)
}

// ── Worker coverage (phase 23): boot-time cron composition ──

// Mirrors the worker's boot goroutine: expire_stale_booking_holds +
// expire_stale_learning_attempts run against the same store, each only
// touching its own domain.
func TestWorkerCronBoot_ExpiresStaleState(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	paymentSvc := NewPaymentService(memory.NewMemoryUnitOfWorkFactory(store), map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack: payment_provider.NewPaystack(paystackSecret),
	}, NewAuditService(store.AuditLogs), store.Escrow)

	// 1) Stale escrow hold (release_at passed) on a real order row.
	order := &payment.Order{ParentUserID: uuid.New(), Status: payment.OrderPending, TotalAmount: 5000, Currency: "NGN"}
	require.NoError(t, store.Orders.Create(ctx, order))
	hold := &payment.EscrowHold{
		OrderID: order.ID, PaymentID: uuid.New(), TutorProfileID: uuid.New(), Amount: 5000,
		Status: payment.EscrowHeld, ReleaseAt: timePtr(time.Now().Add(-time.Hour)),
	}
	require.NoError(t, store.Escrow.Create(ctx, hold))

	// 2) Stale learner attempt (expires_at passed).
	lm := store.Learning
	att := &learning.LearnerAttempt{
		AssessmentID: uuid.New(), StudentProfileID: uuid.New(), TutorProfileID: uuid.New(),
		Status: learning.AttemptInProgress, ExpiresAt: time.Now().Add(-time.Minute),
	}
	require.NoError(t, lm.CreateAttempt(ctx, att))

	// Boot sequence (same as cmd/worker/main.go).
	holds, err := paymentSvc.ExpireStaleHolds(ctx, 200)
	require.NoError(t, err)
	assert.Equal(t, 1, holds)

	attempts, err := lm.ExpireStaleAttempts(ctx, time.Now().UTC())
	require.NoError(t, err)
	assert.Equal(t, int64(1), attempts)

	// Hold released, attempt expired.
	h, err := store.Escrow.GetByID(ctx, hold.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.EscrowReleased, h.Status)

	a, err := lm.GetAttempt(ctx, att.ID)
	require.NoError(t, err)
	assert.Equal(t, learning.AttemptExpired, a.Status)
}

func timePtr(t time.Time) *time.Time { return &t }
