package repository

import (
	"context"

	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/certificate"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
)

// UnitOfWork — transactional scope for money mutations and tutor-status
// changes. Per AGENTS.md: "DB transactions on money mutations" and
// "AuditService on every state change affecting money/access/tutor-status" —
// both happen inside one UoW.
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
	Coupons() payment.CouponRepository
	Certificates() certificate.CertificateRepository
	Admissions() admissions.Repository
	Enrollments() booking.CohortEnrollmentRepository
	Cohorts() booking.CohortRepository
	PrivateRequests() booking.PrivateTuitionRequestRepository
	PrivatePackages() booking.PrivatePackageRepository
	Vetting() vetting.VettingRepository
	TutorSubjects() tutor.TutorSubjectRepository
	AuditLogs() identity.AuditLogRepository
	LessonLinks() booking.LessonParticipantLinker
	Plus() plus.Repository
	Commit(ctx context.Context) error
	Rollback()
}

type UnitOfWorkFactory interface {
	Begin(ctx context.Context) (UnitOfWork, error)
}
