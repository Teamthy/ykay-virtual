package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/certificate"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository"
)

// PgUnitOfWork binds every repository to one *sql.Tx.

type PgUnitOfWork struct {
	tx *sql.Tx

	orders       *OrderRepo
	payments     *PaymentRepo
	webhooks     *PaymentWebhookRepo
	escrow       *EscrowHoldRepo
	payouts      *PayoutRepo
	wallets      *WalletRepo
	enrollments  *CohortEnrollmentRepo
	cohorts      *CohortRepo
	privateReq   *PrivateTuitionRequestRepo
	privatePkg   *PrivatePackageRepo
	vetting      *VettingRepo
	tutorSubj    *TutorSubjectRepo
	auditLogs    *AuditLogRepo
	lessonLinks  *LessonRepo
	coupons      *CouponRepo
	certificates *CertificateRepo
	admissions   *AdmissionsRepo
}

func (u *PgUnitOfWork) LessonLinks() booking.LessonParticipantLinker             { return u.lessonLinks }
func (u *PgUnitOfWork) Orders() payment.OrderRepository                          { return u.orders }
func (u *PgUnitOfWork) Payments() payment.PaymentRepository                      { return u.payments }
func (u *PgUnitOfWork) Webhooks() payment.PaymentWebhookRepository               { return u.webhooks }
func (u *PgUnitOfWork) Escrow() payment.EscrowHoldRepository                     { return u.escrow }
func (u *PgUnitOfWork) Payouts() payment.PayoutRepository                        { return u.payouts }
func (u *PgUnitOfWork) Wallets() payment.WalletRepository                        { return u.wallets }
func (u *PgUnitOfWork) Enrollments() booking.CohortEnrollmentRepository          { return u.enrollments }
func (u *PgUnitOfWork) Cohorts() booking.CohortRepository                        { return u.cohorts }
func (u *PgUnitOfWork) PrivateRequests() booking.PrivateTuitionRequestRepository { return u.privateReq }
func (u *PgUnitOfWork) PrivatePackages() booking.PrivatePackageRepository        { return u.privatePkg }
func (u *PgUnitOfWork) Vetting() vetting.VettingRepository                       { return u.vetting }
func (u *PgUnitOfWork) TutorSubjects() tutor.TutorSubjectRepository              { return u.tutorSubj }
func (u *PgUnitOfWork) AuditLogs() identity.AuditLogRepository                   { return u.auditLogs }
func (u *PgUnitOfWork) Coupons() payment.CouponRepository                        { return u.coupons }
func (u *PgUnitOfWork) Certificates() certificate.CertificateRepository          { return u.certificates }
func (u *PgUnitOfWork) Admissions() admissions.Repository                        { return u.admissions }

func (u *PgUnitOfWork) Commit(ctx context.Context) error {
	if err := u.tx.Commit(); err != nil {
		return fmt.Errorf("commit uow: %w", err)
	}
	return nil
}

func (u *PgUnitOfWork) Rollback() { _ = u.tx.Rollback() }

// --- Factory ---

type PgUnitOfWorkFactory struct{ pg *Postgres }

func NewPgUnitOfWorkFactory(pg *Postgres) *PgUnitOfWorkFactory { return &PgUnitOfWorkFactory{pg: pg} }

func (f *PgUnitOfWorkFactory) Begin(ctx context.Context) (repository.UnitOfWork, error) {
	tx, err := f.pg.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin uow: %w", err)
	}
	return &PgUnitOfWork{
		tx:           tx,
		orders:       NewOrderRepo(tx),
		payments:     NewPaymentRepo(tx),
		webhooks:     NewPaymentWebhookRepo(tx),
		escrow:       NewEscrowHoldRepo(tx),
		payouts:      NewPayoutRepo(tx),
		wallets:      NewWalletRepo(tx),
		enrollments:  NewCohortEnrollmentRepo(tx),
		cohorts:      NewCohortRepo(tx),
		privateReq:   NewPrivateTuitionRequestRepo(tx),
		privatePkg:   NewPrivatePackageRepo(tx),
		vetting:      NewVettingRepo(tx),
		tutorSubj:    NewTutorSubjectRepo(tx),
		auditLogs:    NewAuditLogRepo(tx),
		lessonLinks:  NewLessonRepo(tx),
		coupons:      NewCouponRepo(tx),
		certificates: NewCertificateRepo(tx),
		admissions:   NewAdmissionsRepo(tx),
	}, nil
}

var _ repository.UnitOfWorkFactory = (*PgUnitOfWorkFactory)(nil)
