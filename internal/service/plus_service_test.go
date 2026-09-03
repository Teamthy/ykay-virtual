package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newPlusSvc() *PlusService {
	store := memory.NewMemoryStore()
	svc := NewPlusService(store.Plus, NewAuditService(store.AuditLogs))
	svc.now = func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
	svc.EnsureDefaultPlans(context.Background())
	return svc
}

func TestPlusService_HasActivePlan_And_Activate(t *testing.T) {
	ctx := context.Background()
	svc := newPlusSvc()
	user := uuid.New()

	require.False(t, svc.HasActivePlan(ctx, user), "no subscription yet")

	sub, err := svc.ActivatePlan(ctx, user, plus.PlanPlus, true)
	require.NoError(t, err)
	assert.Equal(t, plus.SubTrial, sub.Status)
	assert.True(t, svc.HasActivePlan(ctx, user))

	status, err := svc.GetMyPlan(ctx, user)
	require.NoError(t, err)
	assert.True(t, status.Active)
	assert.True(t, status.Entitlements.CbtVault)
	assert.True(t, status.Entitlements.VerifiedCerts)
	assert.True(t, status.Entitlements.Transcripts)
	assert.Equal(t, plus.AIAssistPlusPerDay, status.Entitlements.AIAssistPerDay)
}

func TestPlusService_CancelRevokes(t *testing.T) {
	ctx := context.Background()
	svc := newPlusSvc()
	user := uuid.New()
	_, err := svc.ActivatePlan(ctx, user, plus.PlanPlus, false)
	require.NoError(t, err)
	require.True(t, svc.HasActivePlan(ctx, user))

	require.NoError(t, svc.CancelPlan(ctx, user))
	require.False(t, svc.HasActivePlan(ctx, user), "cancelled plan must lose access")

	// No active plan => free allowance.
	assert.Equal(t, plus.AIAssistFreePerDay, svc.AIAllowance(ctx, user))
}

func TestPlusService_AIAllowance_And_Usage(t *testing.T) {
	ctx := context.Background()
	svc := newPlusSvc()
	free := uuid.New()
	plusUser := uuid.New()
	_, _ = svc.ActivatePlan(ctx, plusUser, plus.PlanPlus, false)

	assert.Equal(t, plus.AIAssistFreePerDay, svc.AIAllowance(ctx, free))
	assert.Equal(t, plus.AIAssistPlusPerDay, svc.AIAllowance(ctx, plusUser))

	// Free user exhausts their allowance -> CanUseFeature false.
	for i := 0; i < plus.AIAssistFreePerDay; i++ {
		_, _ = svc.RecordUsage(ctx, free, plus.FeatureAIAssistant)
	}
	assert.False(t, svc.CanUseFeature(ctx, free, plus.FeatureAIAssistant, svc.AIAllowance(ctx, free)))
	// Plus user still has room.
	assert.True(t, svc.CanUseFeature(ctx, plusUser, plus.FeatureAIAssistant, svc.AIAllowance(ctx, plusUser)))
}

func TestPracticeExamService_PremiumGate(t *testing.T) {
	ctx := context.Background()
	plusSvc := newPlusSvc()
	svc := NewPracticeExamService(memory.NewPracticeExamMemory(), memory.NewEnrollmentMemory()).WithPlus(plusSvc)
	student := uuid.New()

	premium := &practice.Exam{
		ID: uuid.New(), TutorID: uuid.New(), Subject: "Maths", Title: "Premium Mock",
		Description: "Plus vault", DurationMinutes: 30, PassingScore: 50,
		Status: practice.StatusActive, Premium: true,
	}
	free := &practice.Exam{
		ID: uuid.New(), TutorID: premium.TutorID, Subject: "Maths", Title: "Free Mock",
		DurationMinutes: 30, PassingScore: 50, Status: practice.StatusActive, Premium: false,
	}
	require.NoError(t, svc.repo.CreateExam(ctx, premium))
	require.NoError(t, svc.repo.CreateExam(ctx, free))

	// Free user only sees the non-premium exam.
	exams, err := svc.ListStudentExams(ctx, student, uuid.New())
	require.NoError(t, err)
	require.Len(t, exams, 1)
	assert.Equal(t, "Free Mock", exams[0].Title)

	// Plus user sees the full vault.
	plusUser := uuid.New()
	_, _ = plusSvc.ActivatePlan(ctx, plusUser, plus.PlanPlus, false)
	exams, err = svc.ListStudentExams(ctx, student, plusUser)
	require.NoError(t, err)
	require.Len(t, exams, 2)

	// Free user cannot start the premium exam.
	_, err = svc.StartAttempt(ctx, student, premium.ID, uuid.New())
	require.ErrorIs(t, err, plus.ErrPremiumRequired)
}

func TestPaymentSettlement_ActivatesPlus(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)

	// Seed a plan with a real ID so the PLUS_SUBSCRIPTION item can reference it.
	planID := uuid.New()
	plusRepo := store.Plus
	require.NoError(t, plusRepo.UpsertPlan(ctx, &plus.Plan{
		ID: planID, Code: "PLUS", Name: "YK-Virtual Plus", Billing: "MONTHLY",
		Price: 52500, Currency: "NGN", TrialDays: 7, IsActive: true,
	}))
	plusSvc := NewPlusService(plusRepo, audit)

	paySvc := NewPaymentService(
		memory.NewMemoryUnitOfWorkFactory(store), testProviders(), audit, store.Escrow,
	).WithPlus(plusSvc)
	paySvc.Clock = func() time.Time { return fixedTime }

	parent := uuid.New()
	ref := "PLUS-PAY-0001"
	order := &payment.Order{
		ParentUserID: parent, Status: payment.OrderPending,
		Subtotal: 52500, TotalAmount: 52500, Currency: "NGN",
	}
	require.NoError(t, store.Orders.Create(ctx, order))
	desc := "YK-Virtual Plus"
	require.NoError(t, store.Orders.CreateItem(ctx, &payment.OrderItem{
		OrderID: order.ID, ItemType: "PLUS_SUBSCRIPTION", ReferenceID: planID,
		Description: &desc, Quantity: 1, UnitPrice: 52500, TotalPrice: 52500,
	}))
	p := &payment.Payment{
		OrderID: order.ID, Provider: payment.ProviderPaystack,
		ProviderReference: &ref, Amount: 52500, Currency: "NGN", Status: payment.PaymentPending,
	}
	require.NoError(t, store.Payments.Create(ctx, p))
	_, _ = store.Wallets.GetOrCreate(ctx, parent, "NGN")

	// Before payment, no active plan.
	require.False(t, plusSvc.HasActivePlan(ctx, parent))

	// Webhook settles → subscription activates.
	payload := paystackWebhook(ref, 5_250_000)
	_, err := paySvc.ProcessWebhook(ctx, payment.ProviderPaystack, payload, signPaystack(payload, paystackSecret), paystackSecret)
	require.NoError(t, err)
	require.True(t, plusSvc.HasActivePlan(ctx, parent), "paid Plus order must grant access")
}
