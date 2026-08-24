package service

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// F-3 verify suite — when the webhook is delayed or lost, the payer can ask
// the API to verify the transaction against the gateway directly. The order
// settles through the SAME path as the webhook (enrolment confirmed, escrow
// held, receipt sent), is idempotent, owner-scoped, and runs the same
// amount/currency reconciliation guards.

type verifiableProvider struct {
	mu     sync.Mutex
	result payment_provider.VerifyResult // Amount is MAJOR units
	err    error
	asks   int
}

func (v *verifiableProvider) Name() string { return "PAYSTACK" }
func (v *verifiableProvider) VerifyWebhookSignature(_ []byte, _, _ string) bool {
	return true
}
func (v *verifiableProvider) CreatePaymentLink(_ float64, _, reference, _ string) (string, error) {
	return "https://pay.test/" + reference, nil
}
func (v *verifiableProvider) Refund(string, float64) error { return nil }
func (v *verifiableProvider) VerifyTransaction(reference string) (*payment_provider.VerifyResult, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	v.asks++
	if v.err != nil {
		return nil, v.err
	}
	r := v.result
	r.Reference = reference
	return &r, nil
}
func (v *verifiableProvider) calls() int {
	v.mu.Lock()
	defer v.mu.Unlock()
	return v.asks
}

func TestVerifyOrder_SettlesWhenGatewayConfirms(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &verifiableProvider{result: payment_provider.VerifyResult{Status: "success", Amount: 75000, Currency: "NGN"}}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	orderID, paymentID := seedOrderAndPayment(t, env, "NUV-VRF-1")

	res, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	require.NoError(t, err)
	assert.True(t, res.Settled)
	assert.Equal(t, payment.OrderPaid, res.OrderStatus)

	// Order PAID, payment SUCCESS, escrow held — the full webhook settlement.
	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPaid, order.Status)
	pm, _ := env.store.Payments.GetByID(ctx, paymentID)
	assert.Equal(t, payment.PaymentSuccess, pm.Status)
	holds, _ := env.store.Escrow.GetByOrderID(ctx, orderID)
	require.Len(t, holds, 1, "escrow hold created by verify settlement")
	enr, err := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	require.NoError(t, err)
	assert.Equal(t, booking.EnrollmentConfirmed, enr.Status)

	// Idempotent: second verify settles nothing and does not ask the gateway.
	res2, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	require.NoError(t, err)
	assert.False(t, res2.Settled)
	assert.Equal(t, payment.OrderPaid, res2.OrderStatus)
	assert.Equal(t, 1, fake.calls(), "gateway asked exactly once")
}

func TestVerifyOrder_Authz(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &verifiableProvider{result: payment_provider.VerifyResult{Status: "success", Amount: 75000, Currency: "NGN"}}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}
	orderID, _ := seedOrderAndPayment(t, env, "NUV-VRF-2")

	// Anonymous: rejected before any gateway call.
	_, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID})
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Another user's order: forbidden, gateway untouched.
	_, err = env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: uuid.New()})
	assert.ErrorIs(t, err, domain.ErrForbidden)
	assert.Zero(t, fake.calls())

	// Admin may verify any order.
	res, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: uuid.New(), IsAdmin: true})
	require.NoError(t, err)
	assert.True(t, res.Settled)
}

func TestVerifyOrder_GatewayPendingDoesNotSettle(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &verifiableProvider{result: payment_provider.VerifyResult{Status: "pending", Amount: 0, Currency: "NGN"}}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}
	orderID, _ := seedOrderAndPayment(t, env, "NUV-VRF-3")

	res, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	require.NoError(t, err, "a truthful 'not paid yet' is not an error")
	assert.False(t, res.Settled)
	assert.Equal(t, payment.OrderPending, res.OrderStatus)
	assert.Equal(t, "pending", res.GatewayStatus)

	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPending, order.Status)
}

func TestVerifyOrder_ReconciliationGuards(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &verifiableProvider{result: payment_provider.VerifyResult{Status: "success", Amount: 1000, Currency: "NGN"}}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}
	orderID, _ := seedOrderAndPayment(t, env, "NUV-VRF-4")

	_, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	assert.ErrorIs(t, err, domain.ErrInvalidInput, "amount mismatch must never settle")
	assert.Contains(t, err.Error(), "amount")

	// Currency mismatch: 75,000 USD must not settle a 75,000 NGN order.
	fake.result = payment_provider.VerifyResult{Status: "success", Amount: 75000, Currency: "USD"}
	_, err = env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
	assert.Contains(t, err.Error(), "currency")

	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPending, order.Status)
}

func TestVerifyOrder_GatewayErrorPropagates(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &verifiableProvider{err: fmt.Errorf("connection reset")}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}
	orderID, _ := seedOrderAndPayment(t, env, "NUV-VRF-5")

	_, err := env.pay.VerifyOrder(ctx, VerifyOrderInput{OrderID: orderID, ActorUserID: env.parent})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "gateway verify")

	// Nothing settled on a gateway error.
	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPending, order.Status)
}
