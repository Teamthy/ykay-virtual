package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetOrderDetailRich — the admin payments console must show WHO paid,
// WHO the payment was for, and every payment row (provider/ref/status/time).
func TestGetOrderDetailRich(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	now := time.Now().UTC()

	parent := &identity.User{
		ID: uuid.New(), Email: "parent@test.com", FirstName: "Tunde", LastName: "Ade",
		Status: identity.UserStatusActive, EmailVerifiedAt: &now, CreatedAt: now,
	}
	require.NoError(t, store.Users.Create(ctx, parent))

	level := "JSS2"
	school := "Lagos Prep"
	student := &identity.StudentProfile{
		ID: uuid.New(), FirstName: "Kemi", LastName: "Ade",
		CurrentLevel: &level, SchoolName: &school, GuardianConsent: true,
	}
	require.NoError(t, store.Students.Create(ctx, student))

	order := &payment.Order{
		ID: uuid.New(), ParentUserID: parent.ID, StudentID: &student.ID,
		Status: payment.OrderPaid, TotalAmount: 50000, Currency: "NGN",
		CreatedAt: now,
	}
	require.NoError(t, store.Orders.Create(ctx, order))

	ref := "PSK-REF-123"
	paidAt := now.Add(time.Minute)
	pay := &payment.Payment{
		ID: uuid.New(), OrderID: order.ID, Provider: payment.ProviderPaystack,
		ProviderReference: &ref, Amount: 50000, Currency: "NGN",
		Status: payment.PaymentSuccess, PaidAt: &paidAt, CreatedAt: now,
	}
	require.NoError(t, store.Payments.Create(ctx, pay))

	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	).WithPayments(store.Orders, store.Payouts).
		WithPaymentRows(store.Payments).
		WithStudents(store.Students).
		WithUsers(store.Users, store.Roles)

	view, err := svc.GetOrderDetailRich(ctx, order.ID)
	require.NoError(t, err)
	require.NotNil(t, view.Order)
	assert.Equal(t, payment.OrderPaid, view.Order.Status)

	require.NotNil(t, view.Payer, "payer identity must be resolved")
	assert.Equal(t, "Tunde Ade", view.Payer.Name)
	assert.Equal(t, "parent@test.com", view.Payer.Email)

	require.NotNil(t, view.Student, "learner identity must be resolved")
	assert.Equal(t, "Kemi Ade", view.Student.Name)
	assert.Equal(t, "JSS2", view.Student.Level)
	assert.Equal(t, "Lagos Prep", view.Student.School)

	require.Len(t, view.Payments, 1, "payment rows must be attached")
	assert.Equal(t, payment.ProviderPaystack, view.Payments[0].Provider)
	assert.Equal(t, ref, *view.Payments[0].ProviderReference)
	assert.NotNil(t, view.Payments[0].PaidAt)
}
