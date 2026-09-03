package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain/advisor"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newAdvisorSvc() (*AdvisorService, *PlusService) {
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	plusSvc := NewPlusService(store.Plus, audit)
	plusSvc.EnsureDefaultPlans(context.Background())
	svc := NewAdvisorService(store.Advisor, audit).WithPlus(plusSvc).WithUsers(store.Users)
	return svc, plusSvc
}

func TestAdvisorService_AssignAndGet(t *testing.T) {
	ctx := context.Background()
	svc, plusSvc := newAdvisorSvc()
	subscriber := uuid.New()
	advisorUser := uuid.New()

	// Not a Plus user yet -> cannot assign.
	_, err := svc.AssignAdvisor(ctx, uuid.New(), subscriber, advisorUser, nil)
	require.Error(t, err)

	// Activate Plus, then assign.
	_, err = plusSvc.ActivatePlan(ctx, subscriber, plus.PlanPlus, false)
	require.NoError(t, err)
	view, err := svc.AssignAdvisor(ctx, uuid.New(), subscriber, advisorUser, strPtr("Focus on GCSE Maths"))
	require.NoError(t, err)
	assert.Equal(t, advisorUser, view.AdvisorUserID)
	assert.Equal(t, subscriber, view.UserID)

	// Subscriber reads their advisor.
	got, err := svc.GetMyAdvisor(ctx, subscriber)
	require.NoError(t, err)
	assert.Equal(t, advisorUser, got.AdvisorUserID)

	// Non-Plus user cannot read an advisor.
	_, err = svc.GetMyAdvisor(ctx, uuid.New())
	require.Error(t, err)
}

func TestAdvisorService_LearningPlan(t *testing.T) {
	ctx := context.Background()
	svc, plusSvc := newAdvisorSvc()
	subscriber := uuid.New()
	student := uuid.New()
	_, _ = plusSvc.ActivatePlan(ctx, subscriber, plus.PlanPlus, false)

	p, err := svc.SetLearningPlan(ctx, uuid.New(), subscriber, student,
		strPtr("Secure a B in Maths"), strPtr("Algebra, Geometry"), strPtr("2 sessions/week"))
	require.NoError(t, err)
	assert.Equal(t, advisor.PlanActive, p.Status)

	got, err := svc.GetMyLearningPlan(ctx, subscriber, student)
	require.NoError(t, err)
	assert.Equal(t, "Secure a B in Maths", *got.Goals)
}

type stubEmailSender struct{ sent []string }

func (s *stubEmailSender) Send(_ context.Context, to, _, _ string) error {
	s.sent = append(s.sent, to)
	return nil
}

func TestPlusReportService_SendWeeklyReports(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	plusSvc := NewPlusService(store.Plus, NewAuditService(store.AuditLogs))
	plusSvc.EnsureDefaultPlans(ctx)

	subscriber := uuid.New()
	require.NoError(t, store.Users.Create(ctx, &identity.User{ID: subscriber, Email: "Ada@example.com", FirstName: "Ada"}))
	_, _ = plusSvc.ActivatePlan(ctx, subscriber, plus.PlanPlus, false)

	mail := &stubEmailSender{}
	svc := NewPlusReportService(store.Plus, store.Users, mail, "https://virtual.ykaycollege.com")
	n, err := svc.SendWeeklyReports(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	require.Len(t, mail.sent, 1)
	assert.Equal(t, "Ada@example.com", mail.sent[0])
}

func TestAdvisorService_GeneratePlanFromScore(t *testing.T) {
	ctx := context.Background()
	svc, plusSvc := newAdvisorSvc()
	subscriber := uuid.New()
	student := uuid.New()
	_, _ = plusSvc.ActivatePlan(ctx, subscriber, plus.PlanPlus, false)

	// Low score -> remediation-focused plan, source DIAGNOSTIC.
	p, err := svc.GeneratePlanFromScore(ctx, subscriber, student, "Mathematics", 2, 10)
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.Equal(t, advisor.SourceDiagnostic, p.Source)
	assert.Contains(t, *p.Goals, "Mathematics")

	// Non-Plus user -> nil,nil (no plan).
	np, err := svc.GeneratePlanFromScore(ctx, uuid.New(), student, "Maths", 5, 10)
	require.NoError(t, err)
	assert.Nil(t, np)
}
