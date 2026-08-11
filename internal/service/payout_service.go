package service

import (
	"context"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// PayoutProvider — outbound money movement seam (bank transfer / provider
// payout API). MockPayoutProvider simulates success for dev + tests.
type PayoutProvider interface {
	Transfer(amount float64, currency string, recipientRef string) (providerRef string, err error)
}

type MockPayoutProvider struct{}

func (m MockPayoutProvider) Transfer(amount float64, currency, recipientRef string) (string, error) {
	return fmt.Sprintf("MOCK-%s", uuid.NewString()[:12]), nil
}

// PayoutService — process_weekly_tutor_payouts cron: PENDING → PROCESSING →
// PAID. Idempotent: only PENDING payouts are picked up, and UpdateStatus
// guards transitions (no double payouts).
type PayoutService struct {
	uows     repository.UnitOfWorkFactory
	audit    identity.AuditService
	provider PayoutProvider
	clock    func() time.Time
}

func NewPayoutService(uows repository.UnitOfWorkFactory, audit identity.AuditService, clock func() time.Time) *PayoutService {
	return &PayoutService{uows: uows, audit: audit, provider: MockPayoutProvider{}, clock: clock}
}

// ProcessPendingPayouts — runs the weekly payout batch. Returns the number of
// payouts successfully paid out.
func (s *PayoutService) ProcessPendingPayouts(ctx context.Context, limit int) (int, error) {
	if limit < 1 {
		limit = 200
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer uow.Rollback()

	pending, err := uow.Payouts().ListByStatus(ctx, payment.PayoutPending, limit)
	if err != nil {
		return 0, err
	}

	paid := 0
	for _, p := range pending {
		// PENDING → PROCESSING (atomic guard against double processing).
		if err := uow.Payouts().UpdateStatus(ctx, p.ID, payment.PayoutProcessing, nil, nil); err != nil {
			continue
		}
		ref, err := s.provider.Transfer(p.Amount, p.Currency, p.TutorProfileID.String())
		if err != nil {
			// Leave in PROCESSING; the cron retries next week. Dead-letter
			// visibility comes with the worker admin (Phase 11).
			continue
		}
		now := s.clock().UTC()
		if err := uow.Payouts().UpdateStatus(ctx, p.ID, payment.PayoutPaid, &ref, &now); err != nil {
			continue
		}
		_ = s.audit.LogStateChange(ctx, nil, identity.AuditPayout, "payout",
			&p.ID, map[string]any{"status": payment.PayoutPending}, map[string]any{
				"status": payment.PayoutPaid, "amount": p.Amount, "currency": p.Currency, "provider_ref": ref,
			}, nil, nil)
		paid++
	}

	if err := uow.Commit(ctx); err != nil {
		return 0, err
	}
	return paid, nil
}

// GetPayoutByEscrow — for the tutor dashboard (Phase 8) and admin console.
func (s *PayoutService) GetPayoutByEscrow(ctx context.Context, escrowHoldID uuid.UUID) (*payment.Payout, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	p, err := uow.Payouts().GetByEscrowHoldID(ctx, escrowHoldID)
	if err != nil {
		return nil, err
	}
	return p, nil
}

var _ = domain.ErrNotFound
