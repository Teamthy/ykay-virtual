package service

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Seat-leak recovery: abandoned checkouts (PENDING enrollment + unpaid order)
// must release the reserved cohort seat, and every downstream path (rebooking,
// late webhook) must stay consistent.

// ageEnrollment backdates the stored enrollment row so the sweep sees it as stale.
func ageEnrollment(t *testing.T, env *testEnv, olderThan time.Duration) {
	t.Helper()
	aged := false
	for _, e := range env.store.Enrollments.All(context.Background()) {
		if e.CohortID == env.cohort {
			e.CreatedAt = time.Now().UTC().Add(-olderThan)
			aged = true
		}
	}
	require.True(t, aged, "no enrollment found to age")
}

func TestExpirePendingEnrollments_ReleasesSeatAndCancelsOrder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "expiry-1",
	})
	require.NoError(t, err)

	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	require.Equal(t, 1, c.EnrolledCount)

	// 3 hours pass without payment.
	ageEnrollment(t, env, 3*time.Hour)

	n, err := env.booking.ExpireStalePendingEnrollments(ctx, 2*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 1, n)

	// Seat released, enrollment cancelled, order cancelled.
	c, _ = env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 0, c.EnrolledCount)
	enr, _ := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	assert.Equal(t, booking.EnrollmentCancelled, enr.Status)
	order, _ := env.store.Orders.GetByID(ctx, res.Order.ID)
	assert.Equal(t, payment.OrderCancelled, order.Status)
}

func TestExpirePendingEnrollments_FreshCheckoutUntouched(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "expiry-fresh",
	})
	require.NoError(t, err)

	// Enrollment is brand new — nothing to expire.
	n, err := env.booking.ExpireStalePendingEnrollments(ctx, 2*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n)

	enr, _ := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	assert.Equal(t, booking.EnrollmentPending, enr.Status)
}

func TestExpirePendingEnrollments_PaidOrderIsSkipped(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "expiry-paid",
	})
	require.NoError(t, err)
	require.NoError(t, env.store.Orders.UpdateStatus(ctx, res.Order.ID, payment.OrderPaid))

	ageEnrollment(t, env, 3*time.Hour)

	n, err := env.booking.ExpireStalePendingEnrollments(ctx, 2*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n)

	// Seat retained — the money already arrived.
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount)
}

func TestRebookAfterExpiredCheckout_RevivesEnrollment(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	first, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "rebook-1",
	})
	require.NoError(t, err)

	ageEnrollment(t, env, 3*time.Hour)
	n, err := env.booking.ExpireStalePendingEnrollments(ctx, 2*time.Hour, 100)
	require.NoError(t, err)
	require.Equal(t, 1, n)

	// The learner comes back and books again — UNIQUE(cohort, student) row is revived.
	second, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "rebook-2",
	})
	require.NoError(t, err)
	assert.NotEqual(t, first.Order.ID, second.Order.ID)

	enr, _ := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	assert.Equal(t, booking.EnrollmentPending, enr.Status)
	require.NotNil(t, enr.OrderID)
	assert.Equal(t, second.Order.ID, *enr.OrderID)

	// Seat re-reserved exactly once.
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount)
}

func TestLateWebhookAfterExpiry_ConfirmsAndRetakesSeat(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "late-webhook",
	})
	require.NoError(t, err)

	// Payment row exists before the expiry sweep runs.
	ref := "NUV-LATE-0001"
	p := &payment.Payment{
		OrderID: res.Order.ID, Provider: payment.ProviderPaystack,
		ProviderReference: &ref, Amount: res.Order.TotalAmount, Currency: "NGN",
		Status: payment.PaymentPending,
	}
	require.NoError(t, env.store.Payments.Create(ctx, p))

	ageEnrollment(t, env, 3*time.Hour)
	n, err := env.booking.ExpireStalePendingEnrollments(ctx, 2*time.Hour, 100)
	require.NoError(t, err)
	require.Equal(t, 1, n)
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	require.Equal(t, 0, c.EnrolledCount)

	// The sweep cancelled the order, but the payer had actually paid — the
	// webhook lands late. Re-open the order the way a gateway retry sees it:
	// webhook processing only refuses already-SUCCESS payments.
	require.NoError(t, env.store.Orders.UpdateStatus(ctx, res.Order.ID, payment.OrderPending))

	payload := paystackWebhook(ref, int(res.Order.TotalAmount*100))
	_, err = env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)

	// Enrollment revived to CONFIRMED and the seat re-taken.
	enr, _ := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	assert.Equal(t, booking.EnrollmentConfirmed, enr.Status)
	c, _ = env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount)
}

func TestWebhook_CurrencyMismatchRejected(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "NUV-CURR-0001"
	seedOrderAndPayment(t, env, ref)

	// Numerically-correct amount, wrong currency (USD vs NGN order).
	payload := []byte(fmt.Sprintf(
		`{"event":"charge.success","data":{"reference":"%s","amount":%d,"currency":"USD","status":"success"}}`,
		ref, 7_500_000))
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Payment must not settle.
	p, _ := env.store.Payments.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	assert.Equal(t, payment.PaymentPending, p.Status)
	enr, _ := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	assert.Equal(t, booking.EnrollmentPending, enr.Status)
}

func TestWebhook_MatchingCurrencyAccepted(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	ref := "NUV-CURR-0002"
	seedOrderAndPayment(t, env, ref)

	payload := []byte(fmt.Sprintf(
		`{"event":"charge.success","data":{"reference":"%s","amount":%d,"currency":"NGN","status":"success"}}`,
		ref, 7_500_000))
	_, err := env.pay.ProcessWebhook(ctx, payment.ProviderPaystack, payload,
		signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)

	p, _ := env.store.Payments.GetByProviderReference(ctx, payment.ProviderPaystack, ref)
	assert.Equal(t, payment.PaymentSuccess, p.Status)
}

// guard against accidental unused import when the file evolves
var _ = json.Marshal
