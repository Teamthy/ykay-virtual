package service

import (
	"context"
	"fmt"
	"strings"
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
//
// SECURITY (YK-005): in production the mock provider MUST NOT record fake
// PAID payouts. ProcessPendingPayouts is fail-closed when failClosed is set —
// it refuses to mark anything PAID (leaving payouts PENDING for a real
// provider) rather than silently pretending money moved.
type PayoutService struct {
	uows       repository.UnitOfWorkFactory
	audit      identity.AuditService
	provider   PayoutProvider
	clock      func() time.Time
	failClosed bool
}

func NewPayoutService(uows repository.UnitOfWorkFactory, audit identity.AuditService, clock func() time.Time) *PayoutService {
	return &PayoutService{uows: uows, audit: audit, provider: MockPayoutProvider{}, clock: clock}
}

// SetFailClosed — when true, the service refuses to mark payouts PAID. Use it
// in production until a real payout provider is configured and certified
// (YK-005). Env-tunable at the worker wiring level.
func (s *PayoutService) SetFailClosed(v bool) { s.failClosed = v }

// WithProvider overrides the payout provider (tests / real provider wiring).
func (s *PayoutService) WithProvider(p PayoutProvider) *PayoutService { s.provider = p; return s }

// ProcessPendingPayouts — runs the weekly payout batch. Returns the number of
// payouts successfully paid out.
func (s *PayoutService) ProcessPendingPayouts(ctx context.Context, limit int) (int, error) {
	// YK-005 fail-closed: do not mark anything PAID when the payout path is
	// disabled (production without a certified real provider). Leave payouts
	// PENDING so a later real provider can settle them; never fake success.
	if s.failClosed {
		return 0, fmt.Errorf("%w: payouts disabled in this environment (no certified provider) — refusing to mark fake PAYOUT as PAID", domain.ErrForbidden)
	}
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

// ConfirmBankPayout — admin attestation that the bank transfer was executed
// externally (bank app / provider dashboard) for a PENDING payout. Records
// the external reference and marks the payout PAID. This is NOT the mock
// provider path: an admin confirms a real transfer they performed, so it is
// allowed even where auto-processing is fail-closed — every confirmation is
// audited against the acting admin.
func (s *PayoutService) ConfirmBankPayout(ctx context.Context, adminID, payoutID uuid.UUID, providerReference string) (*payment.Payout, error) {
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" || len(providerReference) > 255 {
		return nil, fmt.Errorf("%w: provider reference is required (the bank/provider transaction id)", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	p, err := uow.Payouts().GetByID(ctx, payoutID)
	if err != nil {
		return nil, err
	}
	if p.Status != payment.PayoutPending {
		return nil, fmt.Errorf("%w: payout %s is %s (only PENDING payouts can be confirmed)", domain.ErrConflict, p.ID, p.Status)
	}
	now := s.clock().UTC()
	if err := uow.Payouts().UpdateStatus(ctx, payoutID, payment.PayoutPaid, &providerReference, &now); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditPayout, "payout",
		&payoutID, map[string]any{"status": payment.PayoutPending}, map[string]any{
			"status": payment.PayoutPaid, "amount": p.Amount, "currency": p.Currency,
			"provider_reference": providerReference, "manual_confirmation": true,
		}, nil, nil)
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	p.Status = payment.PayoutPaid
	p.ProviderReference = &providerReference
	p.ProcessedAt = &now
	return p, nil
}
