package repository

import (
	"context"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
)

// UnitOfWork — transactional scope for money mutations. Per AGENTS.md:
// "DB transactions on money mutations" and "AuditService on every state
// change affecting money/access/tutor-status" — both happen inside one UoW.
//
// Implementations:
//   - postgres.PgUnitOfWork  → real BEGIN/COMMIT/ROLLBACK on *sql.Tx
//   - memory.MemoryUnitOfWork → shared in-memory stores (tests / dev fallback)
type UnitOfWork interface {
	Orders() payment.OrderRepository
	Payments() payment.PaymentRepository
	Webhooks() payment.PaymentWebhookRepository
	Escrow() payment.EscrowHoldRepository
	Payouts() payment.PayoutRepository
	Wallets() payment.WalletRepository
	Enrollments() booking.CohortEnrollmentRepository
	Cohorts() booking.CohortRepository
	PrivateRequests() booking.PrivateTuitionRequestRepository
	PrivatePackages() booking.PrivatePackageRepository
	AuditLogs() identity.AuditLogRepository
	Commit(ctx context.Context) error
	Rollback()
}

type UnitOfWorkFactory interface {
	Begin(ctx context.Context) (UnitOfWork, error)
}
