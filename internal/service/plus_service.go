package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/repository"
)

// PlusService — NUVORA Plus premium tier: plans, active-subscription
// entitlement, and per-feature daily usage gates (migration 000066).
type PlusService struct {
	repo  plus.Repository
	uows  repository.UnitOfWorkFactory
	audit identity.AuditService
	now   func() time.Time
}

func NewPlusService(repo plus.Repository, audit identity.AuditService) *PlusService {
	return &PlusService{repo: repo, audit: audit, now: time.Now}
}

// WithUnitOfWork wires the order/payment store so a Plus purchase is
// order-backed (goes through the same initiate → webhook → settle flow as
// every other order).
func (s *PlusService) WithUnitOfWork(uows repository.UnitOfWorkFactory) *PlusService {
	s.uows = uows
	return s
}

// EnsureDefaultPlans upserts the bundled plans (idempotent). Called at boot so
// a fresh DB always has the standard Plus tiers.
func (s *PlusService) EnsureDefaultPlans(ctx context.Context) {
	if s.repo == nil {
		return
	}
	defs := []plus.Plan{
		{Code: plus.PlanPlus, Name: "NUVORA Plus", Billing: "MONTHLY", Price: 52500, Currency: "NGN", TrialDays: 7, IsActive: true},
		{Code: plus.PlanPlusFamily, Name: "NUVORA Plus Family", Billing: "MONTHLY", Price: 85000, Currency: "NGN", TrialDays: 7, IsActive: true},
		{Code: plus.PlanPlusTeams, Name: "NUVORA Plus Teams", Billing: "ANNUAL", Price: 900000, Currency: "NGN", TrialDays: 0, IsActive: true},
	}
	for i := range defs {
		_ = s.repo.UpsertPlan(ctx, &defs[i])
	}
}

// ListPlans returns the purchasable plans.
func (s *PlusService) ListPlans(ctx context.Context) ([]plus.Plan, error) {
	if s.repo == nil {
		return []plus.Plan{}, nil
	}
	return s.repo.ListPlans(ctx, true)
}

// HasActivePlan reports whether the user has an active (or trial) subscription
// that has not ended. This is the core entitlement check all gates use.
func (s *PlusService) HasActivePlan(ctx context.Context, userID uuid.UUID) bool {
	if s.repo == nil || userID == uuid.Nil {
		return false
	}
	sub, err := s.repo.GetActiveByUser(ctx, userID, s.now().UTC())
	return err == nil && sub != nil
}

// AIAllowance returns the user's per-day AI-assistant query allowance.
func (s *PlusService) AIAllowance(ctx context.Context, userID uuid.UUID) int {
	if s.HasActivePlan(ctx, userID) {
		return plus.AIAssistPlusPerDay
	}
	return plus.AIAssistFreePerDay
}

// CanUseFeature reports whether the user may use a usage-gated feature today.
// It returns true and does NOT record usage; callers call RecordUsage after
// the action succeeds.
func (s *PlusService) CanUseFeature(ctx context.Context, userID uuid.UUID, feature string, allowance int) bool {
	if s.repo == nil {
		return true // repo unavailable = do not block
	}
	used, err := s.repo.GetUsage(ctx, userID, feature, todayUTC(s.now()))
	if err != nil {
		return true
	}
	return used < allowance
}

// RecordUsage increments a feature's daily counter; returns the new count.
func (s *PlusService) RecordUsage(ctx context.Context, userID uuid.UUID, feature string) (int, error) {
	if s.repo == nil {
		return 0, nil
	}
	return s.repo.IncrementUsage(ctx, userID, feature, todayUTC(s.now()))
}

// GetMyPlan returns the user's active subscription + plan + which premium
// features are unlocked. When no plan is active, returns nil subscription with
// a false entitlement summary.
type PlusStatus struct {
	Active       bool               `json:"active"`
	Subscription *plus.Subscription `json:"subscription,omitempty"`
	Plan         *plus.Plan         `json:"plan,omitempty"`
	Entitlements Entitlements       `json:"entitlements"`
}

// Entitlements — which premium features the user currently has access to.
type Entitlements struct {
	CbtVault       bool `json:"cbt_vault"`      // full practice-exam vault
	VerifiedCerts  bool `json:"verified_certs"` // verified/shareable certificates
	Transcripts    bool `json:"transcripts"`    // recorded-library transcripts
	AiAssistant    bool `json:"ai_assistant"`   // higher AI allowance
	AIAssistPerDay int  `json:"ai_assist_per_day"`
}

func (s *PlusService) GetMyPlan(ctx context.Context, userID uuid.UUID) (*PlusStatus, error) {
	status := &PlusStatus{
		Active:       false,
		Entitlements: Entitlements{},
	}
	if s.repo == nil {
		return status, nil
	}
	sub, err := s.repo.GetActiveByUser(ctx, userID, s.now().UTC())
	if err != nil && err != domain.ErrNotFound {
		return nil, err
	}
	if sub == nil {
		status.Entitlements.AIAssistPerDay = plus.AIAssistFreePerDay
		return status, nil
	}
	plan, err := s.repo.GetPlanByCode(ctx, sub.PlanCode)
	if err != nil {
		plan = nil
	}
	status.Active = true
	status.Subscription = sub
	status.Plan = plan
	status.Entitlements = Entitlements{
		CbtVault:       true,
		VerifiedCerts:  true,
		Transcripts:    true,
		AiAssistant:    true,
		AIAssistPerDay: plus.AIAssistPlusPerDay,
	}
	return status, nil
}

// ActivatePlan starts a subscription for the user. trial=true starts a TRIAL
// subscription that auto-converts (status ACTIVE) once the trial window passes
// (ends_at already reflects the paid term; trial_ends_at marks the trial). For
// simplicity the gate treats TRIAL and ACTIVE identically while ends_at is in
// the future.
func (s *PlusService) ActivatePlan(ctx context.Context, userID uuid.UUID, planCode string, trial bool) (*plus.Subscription, error) {
	if s.repo == nil {
		return nil, errorsPlusUnavailable()
	}
	plan, err := s.repo.GetPlanByCode(ctx, planCode)
	if err != nil {
		return nil, fmt.Errorf("%w: unknown plan", domain.ErrInvalidInput)
	}
	now := s.now().UTC()
	var endsAt time.Time
	if plan.Billing == "ANNUAL" {
		endsAt = now.AddDate(1, 0, 0)
	} else {
		endsAt = now.AddDate(0, 1, 0)
	}
	status := plus.SubActive
	var trialEnds *time.Time
	if trial && plan.TrialDays > 0 {
		status = plus.SubTrial
		t := now.AddDate(0, 0, plan.TrialDays)
		trialEnds = &t
	}
	sub := &plus.Subscription{
		UserID: userID, PlanCode: planCode, Status: status,
		StartedAt: now, TrialEndsAt: trialEnds, EndsAt: endsAt, AutoRenew: true,
	}
	if err := s.repo.Activate(ctx, sub); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditCreate, "plus_subscription",
		&sub.ID, nil, map[string]any{"plan": planCode, "trial": trial}, nil, nil)
	return sub, nil
}

// CancelPlan immediately ends the user's active subscription (access revoked).
func (s *PlusService) CancelPlan(ctx context.Context, userID uuid.UUID) error {
	if s.repo == nil {
		return errorsPlusUnavailable()
	}
	sub, err := s.repo.GetActiveByUser(ctx, userID, s.now().UTC())
	if err != nil {
		return domain.ErrNotFound
	}
	if err := s.repo.Cancel(ctx, sub.ID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditDelete, "plus_subscription",
		&sub.ID, nil, map[string]any{"plan": sub.PlanCode}, nil, nil)
	return nil
}

// ExpireEnded marks ACTIVE/TRIAL subscriptions whose term has passed as
// EXPIRED so the entitlement gate stops returning access. Runs from the
// worker cron. Returns the number expired.
func (s *PlusService) ExpireEnded(ctx context.Context) (int, error) {
	if s.repo == nil {
		return 0, nil
	}
	return s.repo.ExpireEnded(ctx, s.now().UTC())
}

// PurchasePlus creates a PENDING order for the plan price with a
// PLUS_SUBSCRIPTION order item (plan code in the item reference). The user
// then pays through the standard initiate → webhook → settle flow; the
// subscription is activated only once the payment clears
// (PaymentService.activatePlusOnPaid). Returns the order so the client can
// route to payment.
func (s *PlusService) PurchasePlus(ctx context.Context, userID uuid.UUID, planCode string) (*payment.Order, error) {
	if s.repo == nil {
		return nil, errorsPlusUnavailable()
	}
	if s.uows == nil {
		return nil, fmt.Errorf("%w: plus billing is not configured", domain.ErrInvalidInput)
	}
	plan, err := s.repo.GetPlanByCode(ctx, planCode)
	if err != nil {
		return nil, fmt.Errorf("%w: unknown plan", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	order := &payment.Order{
		ParentUserID: userID,
		Status:       payment.OrderPending,
		Subtotal:     plan.Price,
		TotalAmount:  plan.Price,
		Currency:     plan.Currency,
	}
	if err := uow.Orders().Create(ctx, order); err != nil {
		return nil, err
	}
	refID := plan.ID
	desc := "NUVORA Plus: " + plan.Name
	if err := uow.Orders().CreateItem(ctx, &payment.OrderItem{
		OrderID:     order.ID,
		ItemType:    "PLUS_SUBSCRIPTION",
		ReferenceID: refID,
		Description: &desc,
		Quantity:    1,
		UnitPrice:   plan.Price,
		TotalPrice:  plan.Price,
	}); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditCreate, "plus_order",
		&order.ID, nil, map[string]any{"plan": planCode, "total": plan.Price}, nil, nil)
	return order, nil
}

func errorsPlusUnavailable() error {
	return fmt.Errorf("%w: plus store unavailable", domain.ErrInvalidInput)
}

func todayUTC(now time.Time) time.Time {
	y, m, d := now.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
