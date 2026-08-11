package memory

import (
	"context"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository"
)

// MemoryUnitOfWork wraps shared in-memory stores; Commit is a no-op.
// Used by unit tests and the dev fallback (no Postgres available).

type MemoryUnitOfWork struct {
	orders      *OrderMemory
	payments    *PaymentMemory
	webhooks    *WebhookMemory
	escrow      *EscrowMemory
	payouts     *PayoutMemory
	wallets     *WalletMemory
	enrollments *EnrollmentMemory
	cohorts     *CohortMemory
	privateReq  *PrivateReqMemory
	privatePkg  *PrivatePackageMemory
	vetting     *VettingMemory
	tutorSubj   *VettingTutorSubjectMemory
	auditLogs   *AuditLogMemory
}

func (u *MemoryUnitOfWork) Orders() payment.OrderRepository                 { return u.orders }
func (u *MemoryUnitOfWork) Payments() payment.PaymentRepository             { return u.payments }
func (u *MemoryUnitOfWork) Webhooks() payment.PaymentWebhookRepository      { return u.webhooks }
func (u *MemoryUnitOfWork) Escrow() payment.EscrowHoldRepository            { return u.escrow }
func (u *MemoryUnitOfWork) Payouts() payment.PayoutRepository               { return u.payouts }
func (u *MemoryUnitOfWork) Wallets() payment.WalletRepository               { return u.wallets }
func (u *MemoryUnitOfWork) Enrollments() booking.CohortEnrollmentRepository { return u.enrollments }
func (u *MemoryUnitOfWork) Cohorts() booking.CohortRepository               { return u.cohorts }
func (u *MemoryUnitOfWork) PrivateRequests() booking.PrivateTuitionRequestRepository {
	return u.privateReq
}
func (u *MemoryUnitOfWork) PrivatePackages() booking.PrivatePackageRepository { return u.privatePkg }
func (u *MemoryUnitOfWork) Vetting() vetting.VettingRepository                { return u.vetting }
func (u *MemoryUnitOfWork) TutorSubjects() tutor.TutorSubjectRepository       { return u.tutorSubj }
func (u *MemoryUnitOfWork) AuditLogs() identity.AuditLogRepository            { return u.auditLogs }

func (u *MemoryUnitOfWork) Commit(_ context.Context) error { return nil }
func (u *MemoryUnitOfWork) Rollback()                      {}

type MemoryUnitOfWorkFactory struct {
	store *MemoryStore
}

func NewMemoryUnitOfWorkFactory(store *MemoryStore) *MemoryUnitOfWorkFactory {
	return &MemoryUnitOfWorkFactory{store: store}
}

func (f *MemoryUnitOfWorkFactory) Begin(_ context.Context) (repository.UnitOfWork, error) {
	return &MemoryUnitOfWork{
		orders:      f.store.Orders,
		payments:    f.store.Payments,
		webhooks:    f.store.Webhooks,
		escrow:      f.store.Escrow,
		payouts:     f.store.Payouts,
		wallets:     f.store.Wallets,
		enrollments: f.store.Enrollments,
		cohorts:     f.store.Cohorts,
		privateReq:  f.store.PrivateReqs,
		privatePkg:  f.store.PrivatePkgs,
		vetting:     f.store.Vetting,
		tutorSubj:   f.store.TutorSubj,
		auditLogs:   f.store.AuditLogs,
	}, nil
}

var _ repository.UnitOfWorkFactory = (*MemoryUnitOfWorkFactory)(nil)

// MemoryStore — shared state container so multiple UoWs (and services) share
// the same in-memory "database" in tests.
type MemoryStore struct {
	Orders      *OrderMemory
	Payments    *PaymentMemory
	Webhooks    *WebhookMemory
	Escrow      *EscrowMemory
	Payouts     *PayoutMemory
	Wallets     *WalletMemory
	Enrollments *EnrollmentMemory
	Cohorts     *CohortMemory
	PrivateReqs *PrivateReqMemory
	PrivatePkgs *PrivatePackageMemory
	Vetting     *VettingMemory
	TutorSubj   *VettingTutorSubjectMemory
	AuditLogs   *AuditLogMemory
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		Orders:      NewOrderMemory(),
		Payments:    NewPaymentMemory(),
		Webhooks:    NewWebhookMemory(),
		Escrow:      NewEscrowMemory(),
		Payouts:     NewPayoutMemory(),
		Wallets:     NewWalletMemory(),
		Enrollments: NewEnrollmentMemory(),
		Cohorts:     NewCohortMemory(nil),
		PrivateReqs: NewPrivateReqMemory(),
		PrivatePkgs: NewPrivatePackageMemory(),
		Vetting:     NewVettingMemory(),
		TutorSubj:   NewVettingTutorSubjectMemory(),
		AuditLogs:   NewAuditLogMemory(),
	}
}
