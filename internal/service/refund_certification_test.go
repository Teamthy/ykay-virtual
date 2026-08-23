package service

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Refund certification suite — the gateway must be called exactly once per
// refund, never for an already-refunded order, and never when a hold was
// already released for a tutor payout.

type countingProvider struct {
	mu      sync.Mutex
	refunds []struct {
		Ref    string
		Amount float64
	}
	failNext bool
}

func (c *countingProvider) Name() string { return "PAYSTACK" }
func (c *countingProvider) VerifyWebhookSignature(_ []byte, _, _ string) bool {
	return true
}
func (c *countingProvider) CreatePaymentLink(_ float64, _, reference, _ string) (string, error) {
	return "https://pay.test/" + reference, nil
}
func (c *countingProvider) Refund(reference string, amount float64) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.failNext {
		c.failNext = false
		return fmt.Errorf("gateway says no")
	}
	c.refunds = append(c.refunds, struct {
		Ref    string
		Amount float64
	}{reference, amount})
	return nil
}

func (c *countingProvider) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.refunds)
}

// settle drives a booking through webhook settlement so escrow exists.
func settleOrder(t *testing.T, env *testEnv, ref string) (uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	oid, _ := seedOrderAndPayment(t, env, ref)
	payload := paystackWebhook(ref, 7_500_000)
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	holds, _ := env.store.Escrow.GetByOrderID(ctx, oid)
	require.Len(t, holds, 1)
	return oid, holds[0].ID
}

func TestRefundOrder_GatewayCalledOnce_ThenConflict(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &countingProvider{}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	orderID, _ := settleOrder(t, env, "NUV-REF-CERT-1")

	require.NoError(t, env.pay.RefundOrder(ctx, orderID, &env.parent, "requested"))
	assert.Equal(t, 1, fake.count(), "gateway refunded exactly once")
	assert.Equal(t, 75000.0, fake.refunds[0].Amount)

	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderRefunded, order.Status)

	// Second click: conflict, and the gateway is NOT called again.
	err := env.pay.RefundOrder(ctx, orderID, &env.parent, "double click")
	assert.ErrorIs(t, err, domain.ErrConflict)
	assert.Equal(t, 1, fake.count(), "no double gateway refund")
}

func TestRefundOrder_GatewayFailureRollsBack(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &countingProvider{failNext: true}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	orderID, holdID := settleOrder(t, env, "NUV-REF-CERT-2")

	err := env.pay.RefundOrder(ctx, orderID, &env.parent, "requested")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "gateway refund")

	// Nothing persisted: order still PAID, hold still HELD, wallet empty.
	order, _ := env.store.Orders.GetByID(ctx, orderID)
	assert.Equal(t, payment.OrderPaid, order.Status)
	hold, _ := env.store.Escrow.GetByID(ctx, holdID)
	assert.Equal(t, payment.EscrowHeld, hold.Status)
	w, _ := env.store.Wallets.GetByUserID(ctx, env.parent)
	assert.Equal(t, 0.0, w.Balance)
}

func TestRefundOrder_BlockedAfterEscrowRelease(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &countingProvider{}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	orderID, holdID := settleOrder(t, env, "NUV-REF-CERT-3")

	// Escrow released → money is on its way to the tutor.
	_, err := env.pay.ReleaseEscrow(ctx, holdID, ReleaseClientConfirm, &env.parent, nil, nil)
	require.NoError(t, err)

	err = env.pay.RefundOrder(ctx, orderID, &env.parent, "too late")
	assert.ErrorIs(t, err, domain.ErrConflict)
	assert.Contains(t, err.Error(), "released")
	assert.Equal(t, 0, fake.count(), "gateway never touched after release")
}

func TestRefundEscrow_PartialGatewayRefund(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &countingProvider{}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	_, holdID := settleOrder(t, env, "NUV-REF-CERT-4")
	hold, _ := env.store.Escrow.GetByID(ctx, holdID)

	require.NoError(t, env.pay.RefundEscrow(ctx, holdID, &env.parent, "dispute", nil, nil))
	require.Equal(t, 1, fake.count())
	assert.Equal(t, hold.Amount, fake.refunds[0].Amount, "gateway refunds exactly the hold amount")

	// Wallet credited + hold refunded.
	w, _ := env.store.Wallets.GetByUserID(ctx, env.parent)
	assert.Equal(t, hold.Amount, w.Balance)
	h2, _ := env.store.Escrow.GetByID(ctx, holdID)
	assert.Equal(t, payment.EscrowRefunded, h2.Status)
}

func TestRefundEscrow_GatewayFailureRollsBackWallet(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	fake := &countingProvider{failNext: true}
	env.pay.providers = map[payment.PaymentProvider]payment_provider.Provider{payment.ProviderPaystack: fake}

	_, holdID := settleOrder(t, env, "NUV-REF-CERT-5")

	err := env.pay.RefundEscrow(ctx, holdID, &env.parent, "dispute", nil, nil)
	require.Error(t, err)

	// Wallet NOT credited, hold still HELD.
	w, _ := env.store.Wallets.GetByUserID(ctx, env.parent)
	assert.Equal(t, 0.0, w.Balance)
	h, _ := env.store.Escrow.GetByID(ctx, holdID)
	assert.Equal(t, payment.EscrowHeld, h.Status)
	_ = time.Now
}
