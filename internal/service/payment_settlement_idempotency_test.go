package service

import (
	"context"
	"strings"
	"sync"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Exactly-once settlement (financial idempotency) ─────────────────────────
//
// The order PENDING→PAID compare-and-set is the single arbiter shared by the
// webhook, the payer-facing verify endpoint and the admin manual confirm.
// These tests pin the invariant that matters for a public launch: no racing
// settler can ever create a second escrow hold (double payout to the tutor).

// The CAS itself: exactly one winner across any number of callers.
func TestOrderTryMarkPaid_ExactlyOnce(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	order := &payment.Order{ParentUserID: env.parent, Status: payment.OrderPending,
		TotalAmount: 1000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, order))

	first, err := env.store.Orders.TryMarkPaid(ctx, order.ID)
	require.NoError(t, err)
	assert.True(t, first, "first settler must win the CAS")

	second, err := env.store.Orders.TryMarkPaid(ctx, order.ID)
	require.NoError(t, err)
	assert.False(t, second, "every later settler must observe the CAS as lost")

	missing, err := env.store.Orders.TryMarkPaid(ctx, uuid.New())
	require.NoError(t, err)
	assert.False(t, missing)

	o, err := env.store.Orders.GetByID(ctx, order.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)
}

// Designed revival: a checkout-abandon sweep cancelled the order, then the
// capture lands late. The CAS must allow PENDING|CANCELLED → PAID (single
// winner) — but never REFUNDED → PAID.
func TestOrderTryMarkPaid_RevivesCancelledButNeverRefunded(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	cancelled := &payment.Order{ParentUserID: env.parent, Status: payment.OrderCancelled,
		TotalAmount: 1000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, cancelled))

	ok, err := env.store.Orders.TryMarkPaid(ctx, cancelled.ID)
	require.NoError(t, err)
	assert.True(t, ok, "late capture must revive a CANCELLED order (expiry-revival flow)")
	o, _ := env.store.Orders.GetByID(ctx, cancelled.ID)
	assert.Equal(t, payment.OrderPaid, o.Status)

	refunded := &payment.Order{ParentUserID: env.parent, Status: payment.OrderRefunded,
		TotalAmount: 1000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, refunded))
	ok, err = env.store.Orders.TryMarkPaid(ctx, refunded.ID)
	require.NoError(t, err)
	assert.False(t, ok, "a REFUNDED order must never be resurrected to PAID")
	o, _ = env.store.Orders.GetByID(ctx, refunded.ID)
	assert.Equal(t, payment.OrderRefunded, o.Status)

	// The abandon sweep never overwrites a settled order.
	paid := &payment.Order{ParentUserID: env.parent, Status: payment.OrderPaid,
		TotalAmount: 1000, Currency: "NGN"}
	require.NoError(t, env.store.Orders.Create(ctx, paid))
	cancelledBySweep, err := env.store.Orders.CancelIfPending(ctx, paid.ID)
	require.NoError(t, err)
	assert.False(t, cancelledBySweep, "sweep CAS must lose against a settled order")
	o, _ = env.store.Orders.GetByID(ctx, paid.ID)
	assert.Equal(t, payment.OrderPaid, o.Status)
}

// Double capture: the same order gets two successful gateway captures
// (two references). The second webhook must be acknowledged as a duplicate
// with ZERO side effects — one escrow hold, no second enrollment flip, no
// wallet movement — and the anomaly must be recorded for ops reconciliation.
func TestProcessWebhook_SecondCaptureSameOrder_BlockedAsDuplicate(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	ref1, ref2 := "YKAY-20260811-DBLCAP1", "YKAY-20260811-DBLCAP2"
	orderID, paymentID1 := seedOrderAndPayment(t, env, ref1)

	// A second pending attempt on the same order (user opened checkout twice
	// and paid both links at the gateway).
	p2 := &payment.Payment{
		OrderID: orderID, Provider: payment.ProviderPaystack,
		ProviderReference: &ref2, Amount: 75000, Currency: "NGN",
		Status: payment.PaymentPending,
	}
	require.NoError(t, env.store.Payments.Create(ctx, p2))

	// First capture settles the order.
	res1, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack,
		paystackWebhook(ref1, 7_500_000), signPaystack(paystackWebhook(ref1, 7_500_000), paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res1.Processed)
	assert.False(t, res1.Duplicate)

	// Second capture for the same order → duplicate, never a second settle.
	res2, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack,
		paystackWebhook(ref2, 7_500_000), signPaystack(paystackWebhook(ref2, 7_500_000), paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res2.Processed)
	assert.True(t, res2.Duplicate)
	assert.Equal(t, "order_already_settled", res2.Reason)

	// The money invariant: exactly ONE escrow hold exists for the order.
	holds, err := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, holds, 1, "a second capture must never create a second escrow hold")

	// The over-captured attempt stays visibly unsettled for reconciliation,
	// and the original settlement is untouched.
	p2After, err := env.store.Payments.GetByID(ctx, p2.ID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentPending, p2After.Status,
		"over-capture stays PENDING for the payments runbook to refund")

	p1After, err := env.store.Payments.GetByID(ctx, paymentID1)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentSuccess, p1After.Status)

	o, err := env.store.Orders.GetByID(ctx, orderID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)

	// The anomaly is durably auditable (ops reconciliation signal): the
	// duplicate branch writes a payment_webhook audit entry naming the
	// blocked capture so reconciliation can refund it.
	logs, err := env.store.AuditLogs.ListRecent(ctx, string(identity.AuditPayment), "payment_webhook", 10)
	require.NoError(t, err)
	blocked := false
	for _, l := range logs {
		if l.AfterJSON != nil && strings.Contains(*l.AfterJSON, "duplicate_settlement_blocked") {
			blocked = true
			break
		}
	}
	assert.True(t, blocked, "duplicate settlement must leave an audit trail for the payments runbook")

	// A redelivery of the second capture short-circuits as already processed.
	res3, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack,
		paystackWebhook(ref2, 7_500_000), signPaystack(paystackWebhook(ref2, 7_500_000), paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res3.Duplicate)
	assert.Equal(t, "already_processed", res3.Reason)
}

// Storm: concurrent deliveries of the same webhook (the load-test scenario).
// Exactly one settlement wins; every other delivery is acknowledged; the
// store ends with one escrow hold and a PAID order.
func TestProcessWebhook_ConcurrentDeliveries_SingleSettlement(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	ref := "YKAY-20260811-STORM99"
	orderID, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	sig := signPaystack(payload, paystackSecret)

	const n = 20
	results := make([]*WebhookResult, n)
	errs := make([]error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i], errs[i] = env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload, sig, paystackSecret)
		}(i)
	}
	wg.Wait()

	settlements := 0
	for i := 0; i < n; i++ {
		require.NoError(t, errs[i])
		require.NotNil(t, results[i])
		assert.True(t, results[i].Processed)
		if !results[i].Duplicate {
			settlements++
		}
	}
	assert.Equal(t, 1, settlements, "exactly one delivery may observe a fresh settlement")

	holds, err := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, holds, 1, "concurrent deliveries must produce exactly one escrow hold")

	o, err := env.store.Orders.GetByID(ctx, orderID)
	require.NoError(t, err)
	assert.Equal(t, payment.OrderPaid, o.Status)
}

// Manual confirm racing a gateway capture: whichever settles first wins the
// CAS; the loser reports the existing settlement instead of re-applying it.
func TestConfirmManualPayment_AfterWebhook_ReturnsExistingSettlement(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	ref := "YKAY-20260811-MANOVR"
	orderID, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)

	manual, err := env.pay.ConfirmManualPayment(ctx, env.parent, orderID, strPtr("bank transfer received"))
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentSuccess, manual.Status)
	assert.Equal(t, payment.ProviderPaystack, manual.Provider, "must return the winner's (gateway) payment, not a new one")

	// Idempotent replay: same result, no new rows.
	manual2, err := env.pay.ConfirmManualPayment(ctx, env.parent, orderID, strPtr("replayed"))
	require.NoError(t, err)
	assert.Equal(t, manual.ID, manual2.ID)

	holds, err := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, holds, 1, "manual confirm after a webhook must not double-hold escrow")

	payments, err := env.store.Payments.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, payments, 1)
	enr, err := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	require.NoError(t, err)
	assert.Equal(t, booking.EnrollmentConfirmed, enr.Status)
}

// Manual confirm wins first; the gateway's late capture for the same order
// arrives afterwards and must be blocked as a duplicate (over-capture alert),
// never creating a second hold for the tutor.
func TestProcessWebhook_LateCaptureAfterManualConfirm_Blocked(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	ref := "YKAY-20260811-LATECAP"
	orderID, gatewayPaymentID := seedOrderAndPayment(t, env, ref)

	manual, err := env.pay.ConfirmManualPayment(ctx, env.parent, orderID, strPtr("admin confirmed bank transfer"))
	require.NoError(t, err)
	require.Equal(t, payment.PaymentSuccess, manual.Status)

	// The gateway capture finally lands for the still-PENDING gateway attempt.
	res, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack,
		paystackWebhook(ref, 7_500_000), signPaystack(paystackWebhook(ref, 7_500_000), paystackSecret), paystackSecret)
	require.NoError(t, err)
	assert.True(t, res.Processed)
	assert.True(t, res.Duplicate)
	assert.Equal(t, "order_already_settled", res.Reason)

	holds, err := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	assert.Len(t, holds, 1, "late gateway capture must not double-hold escrow")

	// Exactly one SUCCESS payment (the manual one); the gateway row remains
	// visible as an unsettled capture for reconciliation.
	payments, err := env.store.Payments.GetByOrderID(ctx, orderID)
	require.NoError(t, err)
	successes := 0
	for _, p := range payments {
		if p.Status == payment.PaymentSuccess {
			successes++
		}
	}
	assert.Equal(t, 1, successes)
	gw, err := env.store.Payments.GetByID(ctx, gatewayPaymentID)
	require.NoError(t, err)
	assert.Equal(t, payment.PaymentPending, gw.Status,
		"gateway over-capture stays visible for the payments runbook")
}

// Storage-layer backstop: one escrow hold per order is enforced even if a
// future service bug slips past the CAS (mirrors uq_escrow_holds_order_id).
func TestEscrowBackstop_OneHoldPerOrder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	orderID, paymentID := seedOrderAndPayment(t, env, "YKAY-20260811-BACKSTOP")
	first := &payment.EscrowHold{
		OrderID: orderID, PaymentID: paymentID, TutorProfileID: env.tutor,
		Amount: 75000, Status: payment.EscrowHeld,
	}
	require.NoError(t, env.store.Escrow.Create(ctx, first))

	second := &payment.EscrowHold{
		OrderID: orderID, PaymentID: uuid.New(), TutorProfileID: env.tutor,
		Amount: 75000, Status: payment.EscrowHeld,
	}
	err := env.store.Escrow.Create(ctx, second)
	assert.ErrorIs(t, err, domain.ErrAlreadyExists)
}
