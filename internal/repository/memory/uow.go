package memory

import (
	"context"

	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/certificate"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository"
)

// MemoryUnitOfWork wraps shared in-memory stores; Commit is a no-op.
// Used by unit tests and the dev fallback (no Postgres available).

type MemoryUnitOfWork struct {
	orders       *OrderMemory
	payments     *PaymentMemory
	webhooks     *WebhookMemory
	escrow       *EscrowMemory
	payouts      *PayoutMemory
	wallets      *WalletMemory
	enrollments  *EnrollmentMemory
	cohorts      *CohortMemory
	privateReq   *PrivateReqMemory
	privatePkg   *PrivatePackageMemory
	vetting      *VettingMemory
	tutorSubj    *VettingTutorSubjectMemory
	auditLogs    *AuditLogMemory
	lessonLinks  *LessonMemory
	coupons      *CouponMemory
	certificates *CertificateMemory
	admissions   *AdmissionsMemory
}

func (u *MemoryUnitOfWork) LessonLinks() booking.LessonParticipantLinker    { return u.lessonLinks }
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
func (u *MemoryUnitOfWork) Coupons() payment.CouponRepository                 { return u.coupons }
func (u *MemoryUnitOfWork) Certificates() certificate.CertificateRepository   { return u.certificates }
func (u *MemoryUnitOfWork) Admissions() admissions.Repository                 { return u.admissions }

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
		orders:       f.store.Orders,
		payments:     f.store.Payments,
		webhooks:     f.store.Webhooks,
		escrow:       f.store.Escrow,
		payouts:      f.store.Payouts,
		wallets:      f.store.Wallets,
		enrollments:  f.store.Enrollments,
		cohorts:      f.store.Cohorts,
		privateReq:   f.store.PrivateReqs,
		privatePkg:   f.store.PrivatePkgs,
		vetting:      f.store.Vetting,
		tutorSubj:    f.store.TutorSubj,
		auditLogs:    f.store.AuditLogs,
		lessonLinks:  f.store.Lessons,
		coupons:      f.store.Coupons,
		certificates: f.store.Certificates,
		admissions:   f.store.Admissions,
	}, nil
}

var _ repository.UnitOfWorkFactory = (*MemoryUnitOfWorkFactory)(nil)

// MemoryStore — shared state container so multiple UoWs (and services) share
// the same in-memory "database" in tests.
type MemoryStore struct {
	Orders         *OrderMemory
	Payments       *PaymentMemory
	Webhooks       *WebhookMemory
	Escrow         *EscrowMemory
	Payouts        *PayoutMemory
	Wallets        *WalletMemory
	Enrollments    *EnrollmentMemory
	Cohorts        *CohortMemory
	PrivateReqs    *PrivateReqMemory
	PrivatePkgs    *PrivatePackageMemory
	Coupons        *CouponMemory
	Certificates   *CertificateMemory
	Admissions     *AdmissionsMemory
	Vetting        *VettingMemory
	TutorSubj      *VettingTutorSubjectMemory
	Availability   *AvailabilityMemory
	Submissions    *SubmissionMemory
	Assignments    *AssignmentMemory
	Attendance     *AttendanceMemory
	Lessons        *LessonMemory
	Learning       *LearningMemory
	Analytics      *AnalyticsMemory
	Tutors         *TutorMemory
	Subjects       *SubjectMemory
	Programmes     *ProgrammeMemory
	Blogs          *BlogMemory
	Redirects      *RedirectMemory
	Testimonials   *TestimonialMemory
	Referrals      *ReferralMemory
	Institutions   *InstitutionMemory
	Reviews        *ReviewMemory
	ProgrammesSeed []academics.Programme
	Users          *UserMemory
	Sessions       *SessionMemory
	Roles          *RoleMemory
	Students       *StudentProfileMemory
	StudentLinks   *ParentStudentLinkMemory
	AuditLogs      *AuditLogMemory
}

func NewMemoryStore() *MemoryStore {
	students := NewStudentProfileMemory()
	store := &MemoryStore{
		Orders:       NewOrderMemory(),
		Payments:     NewPaymentMemory(),
		Webhooks:     NewWebhookMemory(),
		Escrow:       NewEscrowMemory(),
		Payouts:      NewPayoutMemory(),
		Wallets:      NewWalletMemory(),
		Enrollments:  NewEnrollmentMemory(),
		Cohorts:      NewCohortMemory(nil),
		PrivateReqs:  NewPrivateReqMemory(),
		PrivatePkgs:  NewPrivatePackageMemory(),
		Coupons:      NewCouponMemory(),
		Certificates: NewCertificateMemory(),
		Admissions:   NewAdmissionsMemory(),
		Vetting:      NewVettingMemory(),
		TutorSubj:    NewVettingTutorSubjectMemory(),
		Availability: NewAvailabilityMemory(),
		Submissions:  NewSubmissionMemory(),
		Assignments:  NewAssignmentMemory(),
		Attendance:   NewAttendanceMemory(),
		Lessons:      NewLessonMemory(),
		Learning:     NewLearningMemory(),
		Tutors:       NewTutorMemory(nil),
		Subjects:     NewSubjectMemory(nil),
		Programmes:   NewProgrammeMemory(nil),
		Blogs:        NewBlogMemory(),
		Redirects:    NewRedirectMemory(),
		Testimonials: NewTestimonialMemory(),
		Referrals:    NewReferralMemory(),
		Institutions: NewInstitutionMemory(),
		Reviews:      NewReviewMemory(),
		Users:        NewUserMemory(),
		Sessions:     NewSessionMemory(),
		Roles:        NewRoleMemory(),
		Students:     students,
		StudentLinks: NewParentStudentLinkMemory(students),
		AuditLogs:    NewAuditLogMemory(),
	}
	store.StudentLinks = NewParentStudentLinkMemory(students)
	store.Analytics = NewAnalyticsMemory(store) // reads live from the same store
	// Link the role store so admin user-listing can join role names (dev mode).
	store.Users.SetRoleStore(store.Roles)
	return store
}
