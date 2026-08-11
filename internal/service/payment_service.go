package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// PaymentService — money engine: payment initiation, idempotent signature-
// verified webhooks, escrow hold/release/refund, and the payout crons.
//
// Invariants (per AGENTS.md / PRD):
//   - Webhooks are verified server-side; the client redirect is never trusted.
//   - payment_webhooks.provider_reference UNIQUE ⇒ duplicate webhook delivery
//     can never double-charge (SLO: zero duplicate charges).
//   - All money mutations run inside one UnitOfWork + audit log.

type PaymentService struct {
	uows       repository.UnitOfWorkFactory
	providers  map[payment.PaymentProvider]payment_provider.Provider
	audit      identity.AuditService
	escrowRead payment.EscrowHoldRepository // plain (non-tx) reader for cron scans
	HoldPeriod time.Duration                // default escrow hold before auto-release (Tuteria: 72h)
	Clock      func() time.Time
	PayoutSvc  *PayoutService
	referrals  ReferralQualifier
}

func NewPaymentService(uows repository.UnitOfWorkFactory,
	providers map[payment.PaymentProvider]payment_provider.Provider,
	audit identity.AuditService, escrowRead payment.EscrowHoldRepository) *PaymentService {

	ps := &PaymentService{
		uows:       uows,
		providers:  providers,
		audit:      audit,
		escrowRead: escrowRead,
		HoldPeriod: 72 * time.Hour,
		Clock:      time.Now,
	}
	ps.PayoutSvc = NewPayoutService(uows, audit, ps.Clock)
	return ps
}

// WithReferrals wires the referral qualifier (called after payment success).
func (s *PaymentService) WithReferrals(r ReferralQualifier) *PaymentService {
	s.referrals = r
	return s
}

// --- Payment initiation ---

type InitiatePaymentInput struct {
	OrderID     uuid.UUID
	Provider    payment.PaymentProvider
	PayerEmail  string
	CallbackURL string
	RequestID   *string
	TraceID     *string
}

type InitiationResult struct {
	Payment     *payment.Payment
	PaymentLink string
}

func (s *PaymentService) InitiatePayment(ctx context.Context, in InitiatePaymentInput) (*InitiationResult, error) {
	provider, ok := s.providers[in.Provider]
	if !ok {
		return nil, fmt.Errorf("%w: unsupported provider %s", domain.ErrInvalidInput, in.Provider)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	order, err := uow.Orders().GetByID(ctx, in.OrderID)
	if err != nil {
		return nil, err
	}
	if order.Status != payment.OrderPending {
		return nil, fmt.Errorf("%w: order %s is %s (not PENDING)", domain.ErrConflict, order.OrderNumber, order.Status)
	}

	reference := strings.ToUpper(fmt.Sprintf("%s-%s", order.OrderNumber, uuid.NewString()[:8]))
	metadata := map[string]any{
		"order_number": order.OrderNumber,
		"callback_url": in.CallbackURL,
		"payer_email":  in.PayerEmail,
		"initiated_at": time.Now().UTC().Format(time.RFC3339),
	}
	metaJSON, _ := json.Marshal(metadata)
	metaStr := string(metaJSON)

	p := &payment.Payment{
		OrderID:           order.ID,
		Provider:          in.Provider,
		ProviderReference: &reference,
		Amount:            order.TotalAmount,
		Currency:          order.Currency,
		Status:            payment.PaymentPending,
		Metadata:          &metaStr,
	}
	if err := uow.Payments().Create(ctx, p); err != nil {
		return nil, err
	}

	link, err := provider.CreatePaymentLink(order.TotalAmount, order.Currency, reference, in.PayerEmail)
	if err != nil {
		_ = uow.Payments().UpdateStatus(ctx, p.ID, payment.PaymentFailed, nil)
		_ = s.audit.LogStateChange(ctx, &order.ParentUserID, identity.AuditPayment, "payment",
			&p.ID, nil, map[string]any{"action": "initiate_failed", "provider": in.Provider, "error": err.Error()},
			in.RequestID, in.TraceID)
		_ = uow.Commit(ctx)
		return nil, fmt.Errorf("create payment link: %w", err)
	}

	_ = s.audit.LogStateChange(ctx, &order.ParentUserID, identity.AuditPayment, "payment",
		&p.ID, nil, map[string]any{"action": "initiated", "provider": in.Provider,
			"reference": reference, "amount": p.Amount, "order_number": order.OrderNumber},
		in.RequestID, in.TraceID)

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return &InitiationResult{Payment: p, PaymentLink: link}, nil
}

// --- Webhook processing (idempotent, signature-verified) ---

type WebhookResult struct {
	Processed bool       `json:"processed"`
	Duplicate bool       `json:"duplicate,omitempty"`
	Ignored   bool       `json:"ignored,omitempty"`
	Reason    string     `json:"reason,omitempty"`
	PaymentID *uuid.UUID `json:"payment_id,omitempty"`
}

type webhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		Reference string  `json:"reference"` // paystack
		TxRef     string  `json:"tx_ref"`    // flutterwave
		Amount    float64 `json:"amount"`
		Status    string  `json:"status"`
	} `json:"data"`
}

func (s *PaymentService) ProcessWebhook(ctx context.Context, providerName payment.PaymentProvider, payload []byte, signature, secret string) (*WebhookResult, error) {
	provider, ok := s.providers[providerName]
	if !ok {
		return nil, fmt.Errorf("%w: unsupported provider %s", domain.ErrInvalidInput, providerName)
	}

	var parsed webhookPayload
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return nil, fmt.Errorf("%w: malformed payload", domain.ErrInvalidInput)
	}
	reference := parsed.Data.Reference
	if reference == "" {
		reference = parsed.Data.TxRef
	}
	if reference == "" {
		return nil, fmt.Errorf("%w: payload has no reference", domain.ErrInvalidInput)
	}

	valid := provider.VerifyWebhookSignature(payload, signature, secret)

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	// Idempotent insert: UNIQUE provider_reference. A concurrent duplicate
	// delivery hits ErrAlreadyExists and we just replay the existing state.
	webhook := &payment.PaymentWebhook{
		Provider:          providerName,
		ProviderReference: reference,
		Payload:           string(payload),
		SignatureValid:    valid,
	}
	if err := uow.Webhooks().Create(ctx, webhook); err != nil {
		if errors.Is(err, domain.ErrAlreadyExists) {
			existing, gerr := uow.Webhooks().GetByProviderReference(ctx, providerName, reference)
			if gerr != nil {
				return nil, gerr
			}
			if existing.Processed {
				return &WebhookResult{Processed: true, Duplicate: true, Reason: "already_processed"}, nil
			}
			webhook = existing // unprocessed duplicate: continue processing
		} else {
			return nil, err
		}
	}

	if !valid {
		// Persist for forensics; do not process. Transport maps to 400 so the
		// provider flags the delivery.
		_ = uow.Commit(ctx)
		return nil, fmt.Errorf("%w: signature verification failed", domain.ErrInvalidSignature)
	}

	if !isSuccessEvent(parsed) {
		if err := uow.Webhooks().MarkProcessed(ctx, webhook.ID); err != nil {
			return nil, err
		}
		_ = uow.Commit(ctx)
		return &WebhookResult{Processed: true, Ignored: true, Reason: "non_success_event"}, nil
	}

	paymentRow, err := uow.Payments().GetByProviderReference(ctx, providerName, reference)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			// No matching payment: log + consume the webhook (nothing to charge).
			_ = uow.Webhooks().MarkProcessed(ctx, webhook.ID)
			_ = uow.Commit(ctx)
			return &WebhookResult{Processed: true, Ignored: true, Reason: "no_matching_payment"}, nil
		}
		return nil, err
	}

	// Idempotency: already SUCCESS → acknowledge, do not mutate again.
	if paymentRow.Status == payment.PaymentSuccess {
		_ = uow.Webhooks().MarkProcessed(ctx, webhook.ID)
		_ = uow.Commit(ctx)
		return &WebhookResult{Processed: true, Duplicate: true, Reason: "payment_already_success", PaymentID: &paymentRow.ID}, nil
	}

	// Amount reconciliation guard: reject over/under-credits.
	if err := s.checkAmount(providerName, parsed.Data.Amount, paymentRow.Amount); err != nil {
		_ = uow.Webhooks().MarkProcessed(ctx, webhook.ID)
		_ = s.audit.LogStateChange(ctx, nil, identity.AuditPayment, "payment_webhook", &webhook.ID,
			nil, map[string]any{"action": "amount_mismatch", "received": parsed.Data.Amount, "expected": paymentRow.Amount},
			nil, nil)
		_ = uow.Commit(ctx)
		return nil, err
	}

	now := s.Clock().UTC()
	order, err := uow.Orders().GetByID(ctx, paymentRow.OrderID)
	if err != nil {
		return nil, err
	}

	if err := uow.Payments().UpdateStatus(ctx, paymentRow.ID, payment.PaymentSuccess, &now); err != nil {
		return nil, err
	}
	if err := uow.Orders().UpdateStatus(ctx, order.ID, payment.OrderPaid); err != nil {
		return nil, err
	}
	if s.referrals != nil {
		// Referral rewards qualify on first paid order (idempotent).
		if err := s.referrals.QualifyOnOrderPaid(ctx, order.ParentUserID, order.ID); err != nil {
			return nil, err
		}
	}

	// Confirm the cohort enrollment tied to this order.
	if err := s.confirmEnrollment(ctx, uow, order.ID, now); err != nil {
		return nil, err
	}

	// Escrow hold: money is captured but not yet released to the tutor.
	hold, err := s.createEscrowHold(ctx, uow, order, paymentRow, now)
	if err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, &order.ParentUserID, identity.AuditPayment, "order",
		&order.ID, map[string]any{"status": payment.OrderPending}, map[string]any{"status": payment.OrderPaid},
		nil, nil)
	if hold != nil {
		_ = s.audit.LogStateChange(ctx, &order.ParentUserID, identity.AuditPayment, "escrow_hold",
			&hold.ID, nil, map[string]any{"action": "held", "amount": hold.Amount, "release_at": hold.ReleaseAt},
			nil, nil)
	}

	if err := uow.Webhooks().MarkProcessed(ctx, webhook.ID); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return &WebhookResult{Processed: true, PaymentID: &paymentRow.ID}, nil
}

// confirmEnrollment flips the cohort enrollment linked to the order to
// CONFIRMED once payment succeeds (private bookings have no enrollment row).
func (s *PaymentService) confirmEnrollment(ctx context.Context, uow repository.UnitOfWork,
	orderID uuid.UUID, now time.Time) error {

	order, err := uow.Orders().GetByID(ctx, orderID)
	if err != nil {
		return err
	}
	items, err := uow.Orders().ListItems(ctx, orderID)
	if err != nil {
		return err
	}
	for _, it := range items {
		if it.ItemType != "COHORT" {
			continue
		}
		enrollment, err := uow.Enrollments().GetByCohortAndStudent(ctx, it.ReferenceID, *order.StudentID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				continue
			}
			return err
		}
		if enrollment.Status == booking.EnrollmentConfirmed {
			return nil
		}
		return uow.Enrollments().UpdateStatus(ctx, enrollment.ID, booking.EnrollmentConfirmed)
	}
	return nil
}

// createEscrowHold — the tutor (cohort tutor or package tutor) is the
// eventual payee. release_at = now + HoldPeriod ⇒ the expire_stale_booking_holds
// cron auto-releases (Tuteria parity: confirm or 3-day auto).
func (s *PaymentService) createEscrowHold(ctx context.Context, uow repository.UnitOfWork,
	order *payment.Order, p *payment.Payment, now time.Time) (*payment.EscrowHold, error) {

	items, err := uow.Orders().ListItems(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	var tutorID *uuid.UUID
	for _, it := range items {
		switch it.ItemType {
		case "COHORT":
			cohort, err := uow.Cohorts().GetByID(ctx, it.ReferenceID)
			if err != nil && !errors.Is(err, domain.ErrNotFound) {
				return nil, err
			}
			if err == nil {
				tutorID = cohort.TutorProfileID
			}
		case "PRIVATE_PACKAGE":
			pkg, err := uow.PrivatePackages().GetByID(ctx, it.ReferenceID)
			if err != nil && !errors.Is(err, domain.ErrNotFound) {
				return nil, err
			}
			if err == nil {
				tutorID = &pkg.TutorProfileID
			}
		}
	}
	if tutorID == nil {
		// No tutor yet (cohort not assigned): funds remain captured but
		// un-held; they will be held on tutor assignment (Phase 8).
		return nil, nil
	}
	releaseAt := now.Add(s.HoldPeriod)
	hold := &payment.EscrowHold{
		OrderID:        order.ID,
		PaymentID:      p.ID,
		TutorProfileID: *tutorID,
		Amount:         p.Amount,
		Status:         payment.EscrowHeld,
		ReleaseAt:      &releaseAt,
	}
	if err := uow.Escrow().Create(ctx, hold); err != nil {
		return nil, err
	}
	return hold, nil
}

// checkAmount — normalized amount reconciliation (paystack amount is in kobo).
func (s *PaymentService) checkAmount(provider payment.PaymentProvider, received, expected float64) error {
	if received <= 0 {
		return nil // amount absent — skip reconciliation
	}
	normalized := received
	if provider == payment.ProviderPaystack {
		normalized = received / 100
	}
	diff := normalized - expected
	if diff < -0.01 || diff > 0.01 {
		return fmt.Errorf("%w: amount mismatch received=%.2f expected=%.2f", domain.ErrInvalidInput, normalized, expected)
	}
	return nil
}

func isSuccessEvent(p webhookPayload) bool {
	ev := strings.ToLower(p.Event)
	status := strings.ToLower(p.Data.Status)
	if strings.HasSuffix(ev, ".success") || strings.HasSuffix(ev, ".completed") {
		return true
	}
	return status == "success" || status == "successful"
}

// --- Escrow lifecycle ---

type ReleaseMode string

const (
	ReleaseClientConfirm ReleaseMode = "CLIENT_CONFIRM" // parent confirms lessons delivered
	ReleaseAutoExpire    ReleaseMode = "AUTO_EXPIRE"    // cron: release_at passed (3-day auto)
)

func (s *PaymentService) ReleaseEscrow(ctx context.Context, escrowHoldID uuid.UUID,
	mode ReleaseMode, actorID *uuid.UUID, reqID, traceID *string) (*payment.Payout, error) {

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	hold, err := uow.Escrow().GetByID(ctx, escrowHoldID)
	if err != nil {
		return nil, err
	}
	if hold.Status != payment.EscrowHeld {
		return nil, fmt.Errorf("%w: escrow hold %s is %s (not HELD)", domain.ErrConflict, hold.ID, hold.Status)
	}
	order, err := uow.Orders().GetByID(ctx, hold.OrderID)
	if err != nil {
		return nil, err
	}

	now := s.Clock().UTC()
	if err := uow.Escrow().UpdateStatus(ctx, hold.ID, payment.EscrowReleased, &now, nil); err != nil {
		return nil, err
	}
	payout := &payment.Payout{
		TutorProfileID: hold.TutorProfileID,
		EscrowHoldID:   hold.ID,
		Amount:         hold.Amount,
		Currency:       order.Currency,
		Status:         payment.PayoutPending,
	}
	if err := uow.Payouts().Create(ctx, payout); err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, actorID, identity.AuditPayout, "escrow_hold",
		&hold.ID, map[string]any{"status": payment.EscrowHeld}, map[string]any{
			"status": payment.EscrowReleased, "mode": mode, "payout_id": payout.ID,
		}, reqID, traceID)

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return payout, nil
}

// RefundEscrow — dispute/refund path: escrow → REFUNDED, parent wallet
// credited, order + enrollment → REFUNDED (Tuteria dispute-hold parity).
func (s *PaymentService) RefundEscrow(ctx context.Context, escrowHoldID uuid.UUID,
	actorID *uuid.UUID, reason string, reqID, traceID *string) error {

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	hold, err := uow.Escrow().GetByID(ctx, escrowHoldID)
	if err != nil {
		return err
	}
	if hold.Status != payment.EscrowHeld {
		return fmt.Errorf("%w: escrow hold %s is %s (not HELD)", domain.ErrConflict, hold.ID, hold.Status)
	}
	order, err := uow.Orders().GetByID(ctx, hold.OrderID)
	if err != nil {
		return err
	}

	now := s.Clock().UTC()
	if err := uow.Escrow().UpdateStatus(ctx, hold.ID, payment.EscrowRefunded, &now, &reason); err != nil {
		return err
	}
	if err := uow.Wallets().Credit(ctx, order.ParentUserID, hold.Amount); err != nil {
		return err
	}
	if err := uow.Orders().UpdateStatus(ctx, order.ID, payment.OrderRefunded); err != nil {
		return err
	}
	if items, err := uow.Orders().ListItems(ctx, order.ID); err == nil {
		for _, it := range items {
			if it.ItemType != "COHORT" {
				continue
			}
			if enrollment, err := uow.Enrollments().GetByCohortAndStudent(ctx, it.ReferenceID, *order.StudentID); err == nil {
				_ = uow.Enrollments().UpdateStatus(ctx, enrollment.ID, booking.EnrollmentRefunded)
			}
			break
		}
	}

	_ = s.audit.LogStateChange(ctx, actorID, identity.AuditPayment, "escrow_hold",
		&hold.ID, map[string]any{"status": payment.EscrowHeld}, map[string]any{
			"status": payment.EscrowRefunded, "reason": reason, "wallet_credited": hold.Amount,
		}, reqID, traceID)

	return uow.Commit(ctx)
}

// ExpireStaleHolds — cron: auto-release every HELD hold whose release_at has
// passed (Tuteria 3-day auto-release parity). Idempotent per hold.
func (s *PaymentService) ExpireStaleHolds(ctx context.Context, limit int) (int, error) {
	if s.escrowRead == nil {
		return 0, nil
	}
	stale, err := s.escrowRead.ListStaleHeld(ctx, s.Clock().UTC(), limit)
	if err != nil {
		return 0, err
	}
	released := 0
	for _, hold := range stale {
		_, err := s.ReleaseEscrow(ctx, hold.ID, ReleaseAutoExpire, nil, nil, nil)
		if err != nil {
			continue // next cron tick retries
		}
		released++
	}
	return released, nil
}

// ReferralQualifier — called when an order becomes PAID (referral rewards).
type ReferralQualifier interface {
	QualifyOnOrderPaid(ctx context.Context, userID, orderID uuid.UUID) error
}
