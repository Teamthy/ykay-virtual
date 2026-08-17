package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// BookingService — creates bookings (cohort enrollment / private package) as
// PENDING orders inside a single transaction with idempotency-key replay
// protection. Money flows continue in PaymentService (initiate → webhook →
// escrow → payout).

type BookingService struct {
	uows         repository.UnitOfWorkFactory
	students     booking.StudentProfileReader
	tutorSubject booking.TutorProfileReader
	audit        identity.AuditService
}

func NewBookingService(uows repository.UnitOfWorkFactory, students booking.StudentProfileReader,
	tutorSubject booking.TutorProfileReader, audit identity.AuditService) *BookingService {
	return &BookingService{uows: uows, students: students, tutorSubject: tutorSubject, audit: audit}
}

// authorizeEnrollment — the shared object-level authorization + minor gating
// for cohort and private bookings (Phase 3):
//   - a PARENT may book for a linked learner (guardian involved);
//   - a STUDENT may book for THEMSELVES (self-enrollment), unless the learner
//     is a minor (<17) with no linked parent/guardian — minors must have
//     parental involvement before enrolling or paying.
//
// A nil reader preserves the legacy dev-mode behaviour (allow).
func (s *BookingService) authorizeEnrollment(ctx context.Context, studentID, actorUserID uuid.UUID) error {
	if s.students == nil {
		return nil
	}
	acc, err := s.students.StudentBookingAccess(ctx, studentID, actorUserID)
	if err != nil {
		return err
	}
	switch {
	case acc.ParentLinked:
		return nil
	case acc.SelfOwned && !isMinorAt(acc.DateOfBirth, time.Now()):
		return nil // adult self-enrollment
	case acc.SelfOwned && acc.HasLinkedParent:
		return nil // minor with a linked guardian
	case acc.SelfOwned:
		return fmt.Errorf("%w: learner is under 17 and needs a linked parent or guardian to enrol", domain.ErrForbidden)
	default:
		return domain.ErrForbidden
	}
}

// isMinorAt reports whether a known date of birth makes the learner under 17.
// A missing date of birth is treated as not-a-minor (adult self-service);
// parents enrolling a child through the linked-parent path are never blocked.
func isMinorAt(dob *time.Time, now time.Time) bool {
	if dob == nil {
		return false
	}
	age := now.Year() - dob.Year()
	if now.YearDay() < dob.YearDay() {
		age--
	}
	return age < 17
}

type CreateCohortBookingInput struct {
	CohortID       uuid.UUID
	ParentUserID   uuid.UUID
	StudentID      uuid.UUID
	IdempotencyKey string
	RequestID      *string
	TraceID        *string
}

type CreatePrivateBookingInput struct {
	ParentUserID    uuid.UUID
	StudentID       uuid.UUID
	TutorProfileID  uuid.UUID
	SubjectID       uuid.UUID
	TotalSessions   int
	SessionDuration int // minutes
	// PricePerSession is IGNORED. The published tutor rate is used (YK-042).
	PricePerSession float64
	Currency        string
	IdempotencyKey  string
	Goals           *string
	PreferredDays   *string
	PreferredTime   *string
	RequestID       *string
	TraceID         *string
}

type BookingResult struct {
	Order        *payment.Order
	Items        []payment.OrderItem
	EnrollmentID *uuid.UUID // set for cohort bookings
	PackageID    *uuid.UUID // set for private bookings
	Replayed     bool       // true when idempotency key matched an existing order
}

// CreateCohortBooking — transactional: order + order item + PENDING enrollment
// + capacity increment (row locked), wallet ensured, audit written. A
// duplicate idempotency_key returns the existing order untouched (replay).
func (s *BookingService) CreateCohortBooking(ctx context.Context, in CreateCohortBookingInput) (*BookingResult, error) {
	if in.IdempotencyKey != "" {
		if res, err := s.replay(ctx, in.ParentUserID, in.IdempotencyKey); err == nil {
			return res, nil
		} else if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
	}

	if err := s.authorizeEnrollment(ctx, in.StudentID, in.ParentUserID); err != nil {
		return nil, err
	}

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	// Row lock prevents oversubscription under concurrency.
	cohort, err := uow.Cohorts().GetByIDForUpdate(ctx, in.CohortID)
	if err != nil {
		return nil, err
	}
	if !cohort.CanEnroll() {
		return nil, fmt.Errorf("%w: cohort %s status=%s capacity=%d enrolled=%d",
			domain.ErrCapacityFull, cohort.ID, cohort.Status, cohort.Capacity, cohort.EnrolledCount)
	}
	if existing, err := uow.Enrollments().GetByCohortAndStudent(ctx, cohort.ID, in.StudentID); err == nil {
		return nil, fmt.Errorf("%w: student %s already enrolled in cohort %s (enrollment %s, status %s)",
			domain.ErrConflict, in.StudentID, cohort.ID, existing.ID, existing.Status)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	order := &payment.Order{
		ParentUserID:   in.ParentUserID,
		StudentID:      &in.StudentID,
		Status:         payment.OrderPending,
		Subtotal:       cohort.Fee,
		DiscountAmount: 0,
		TotalAmount:    cohort.Fee,
		Currency:       cohort.Currency,
	}
	if in.IdempotencyKey != "" {
		order.IdempotencyKey = &in.IdempotencyKey
	}
	if err := uow.Orders().Create(ctx, order); err != nil {
		return nil, err
	}

	desc := "Cohort enrollment: " + cohort.Title
	item := &payment.OrderItem{
		OrderID:     order.ID,
		ItemType:    "COHORT",
		ReferenceID: cohort.ID,
		Description: &desc,
		Quantity:    1,
		UnitPrice:   cohort.Fee,
		TotalPrice:  cohort.Fee,
	}
	if err := uow.Orders().CreateItem(ctx, item); err != nil {
		return nil, err
	}

	enrollment := &booking.CohortEnrollment{
		CohortID:         cohort.ID,
		StudentProfileID: in.StudentID,
		ParentUserID:     in.ParentUserID,
		OrderID:          &order.ID,
		Status:           booking.EnrollmentPending,
	}
	if err := uow.Enrollments().Create(ctx, enrollment); err != nil {
		return nil, err
	}
	if err := uow.Cohorts().IncrementEnrolledCount(ctx, cohort.ID, 1); err != nil {
		return nil, err
	}
	if _, err := uow.Wallets().GetOrCreate(ctx, in.ParentUserID, order.Currency); err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, &in.ParentUserID, identity.AuditCreate, "order",
		&order.ID, nil, map[string]any{
			"order_number": order.OrderNumber, "type": "COHORT", "cohort_id": cohort.ID,
			"student_id": in.StudentID, "total": order.TotalAmount, "currency": order.Currency,
			"idempotency_key": in.IdempotencyKey,
		}, in.RequestID, in.TraceID)

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	items, _ := uow.Orders().ListItems(ctx, order.ID)
	return &BookingResult{Order: order, Items: items, EnrollmentID: &enrollment.ID}, nil
}

// CreatePrivateBooking — creates a private tuition request (PENDING), an
// ACTIVE package and a PENDING order for the package, all in one transaction.
func (s *BookingService) CreatePrivateBooking(ctx context.Context, in CreatePrivateBookingInput) (*BookingResult, error) {
	if in.TotalSessions < 1 {
		return nil, fmt.Errorf("%w: total_sessions must be >= 1", domain.ErrInvalidInput)
	}
	if in.SessionDuration < 15 {
		return nil, fmt.Errorf("%w: session_duration_minutes must be >= 15", domain.ErrInvalidInput)
	}
	if s.tutorSubject == nil {
		return nil, fmt.Errorf("%w: tutor rate card is not configured", domain.ErrInvalidInput)
	}
	publishedRate, publishedCurrency, err := s.tutorSubject.SessionRate(ctx, in.TutorProfileID)
	if err != nil {
		return nil, err
	}
	if publishedRate <= 0 {
		return nil, fmt.Errorf("%w: tutor has no published session rate", domain.ErrInvalidInput)
	}
	in.PricePerSession = publishedRate
	if publishedCurrency != "" {
		in.Currency = publishedCurrency
	}
	if in.Currency == "" {
		in.Currency = "NGN"
	}
	if in.IdempotencyKey != "" {
		if res, err := s.replay(ctx, in.ParentUserID, in.IdempotencyKey); err == nil {
			return res, nil
		} else if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
	}

	if err := s.authorizeEnrollment(ctx, in.StudentID, in.ParentUserID); err != nil {
		return nil, err
	}
	if s.tutorSubject != nil {
		ok, err := s.tutorSubject.TutorCanTeach(ctx, in.TutorProfileID, in.SubjectID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, fmt.Errorf("%w: tutor cannot teach subject", domain.ErrForbidden)
		}
	}

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	req := &booking.PrivateTuitionRequest{
		ParentUserID:     in.ParentUserID,
		StudentProfileID: in.StudentID,
		SubjectID:        in.SubjectID,
		Goals:            in.Goals,
		PreferredDays:    in.PreferredDays,
		PreferredTime:    in.PreferredTime,
		Timezone:         "Africa/Lagos",
		LocationMode:     "ONLINE",
		Status:           booking.PrivatePending,
	}
	if err := uow.PrivateRequests().Create(ctx, req); err != nil {
		return nil, err
	}

	pkg := &booking.PrivatePackage{
		RequestID:           req.ID,
		TutorProfileID:      in.TutorProfileID,
		StudentProfileID:    in.StudentID,
		TotalSessions:       in.TotalSessions,
		SessionDurationMins: in.SessionDuration,
		PricePerSession:     in.PricePerSession,
		TotalPrice:          in.PricePerSession * float64(in.TotalSessions),
		Currency:            strings.ToUpper(in.Currency),
		// YK-004: the package must NOT be active before payment. It starts
		// PENDING_PAYMENT and is activated only when the order is settled.
		Status: booking.PrivatePackagePendingPayment,
	}
	if err := uow.PrivatePackages().Create(ctx, pkg); err != nil {
		return nil, err
	}

	order := &payment.Order{
		ParentUserID:   in.ParentUserID,
		StudentID:      &in.StudentID,
		Status:         payment.OrderPending,
		Subtotal:       pkg.TotalPrice,
		DiscountAmount: 0,
		TotalAmount:    pkg.TotalPrice,
		Currency:       pkg.Currency,
	}
	if in.IdempotencyKey != "" {
		order.IdempotencyKey = &in.IdempotencyKey
	}
	if err := uow.Orders().Create(ctx, order); err != nil {
		return nil, err
	}

	desc := fmt.Sprintf("Private tuition: %d x %dmin sessions", pkg.TotalSessions, pkg.SessionDurationMins)
	item := &payment.OrderItem{
		OrderID:     order.ID,
		ItemType:    "PRIVATE_PACKAGE",
		ReferenceID: pkg.ID,
		Description: &desc,
		Quantity:    1,
		UnitPrice:   pkg.TotalPrice,
		TotalPrice:  pkg.TotalPrice,
	}
	if err := uow.Orders().CreateItem(ctx, item); err != nil {
		return nil, err
	}
	if _, err := uow.Wallets().GetOrCreate(ctx, in.ParentUserID, order.Currency); err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, &in.ParentUserID, identity.AuditCreate, "order",
		&order.ID, nil, map[string]any{
			"order_number": order.OrderNumber, "type": "PRIVATE_PACKAGE",
			"package_id": pkg.ID, "tutor_profile_id": in.TutorProfileID,
			"student_id": in.StudentID, "total": order.TotalAmount, "currency": order.Currency,
			"idempotency_key": in.IdempotencyKey,
		}, in.RequestID, in.TraceID)

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	items, _ := uow.Orders().ListItems(ctx, order.ID)
	return &BookingResult{Order: order, Items: items, PackageID: &pkg.ID}, nil
}

// GetOrder — order + items for the checkout status page.
func (s *BookingService) GetOrder(ctx context.Context, orderID uuid.UUID) (*payment.Order, []payment.OrderItem, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer uow.Rollback()
	order, err := uow.Orders().GetByID(ctx, orderID)
	if err != nil {
		return nil, nil, err
	}
	items, err := uow.Orders().ListItems(ctx, orderID)
	if err != nil {
		return nil, nil, err
	}
	return order, items, nil
}

// replay — idempotency-key replay returns the original order (HTTP 200 with
// the same body) instead of creating a duplicate charge.
func (s *BookingService) replay(ctx context.Context, parentUserID uuid.UUID, key string) (*BookingResult, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	order, err := uow.Orders().GetByIDempotencyKey(ctx, key)
	if err != nil {
		return nil, err
	}
	if order.ParentUserID != parentUserID {
		return nil, domain.ErrForbidden
	}
	items, err := uow.Orders().ListItems(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	return &BookingResult{Order: order, Items: items, Replayed: true}, nil
}
