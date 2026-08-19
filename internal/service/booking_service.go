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

// CreatePrivateRequestInput — the "request" leg of the managed-matching journey:
// a parent asks to be matched to a tutor for a subject, without picking one yet.
type CreatePrivateRequestInput struct {
	ParentUserID  uuid.UUID
	StudentID     uuid.UUID
	SubjectID     uuid.UUID
	Goals         string
	PreferredDays string
	PreferredTime string
	Timezone      string
	LocationMode  string
	RequestID     *string
	TraceID       *string
}

// MatchPrivateRequestResult — the "match" leg: an admin assigns a tutor, which
// creates a payable package + order the parent then pays (escrow).
type MatchPrivateRequestResult struct {
	Request *booking.PrivateTuitionRequest
	Package *booking.PrivatePackage
	Order   *payment.Order
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

// CreatePrivateTuitionRequest — the request leg of managed matching. Unlike
// CreatePrivateBooking it requires NO tutor and creates NO order: the parent
// asks to be matched, and an admin assigns a vetted tutor later.
func (s *BookingService) CreatePrivateTuitionRequest(ctx context.Context, in CreatePrivateRequestInput) (*booking.PrivateTuitionRequest, error) {
	if err := s.authorizeEnrollment(ctx, in.StudentID, in.ParentUserID); err != nil {
		return nil, err
	}
	if in.SubjectID == uuid.Nil {
		return nil, fmt.Errorf("%w: subject is required", domain.ErrInvalidInput)
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Lagos"
	}
	if in.LocationMode == "" {
		in.LocationMode = "ONLINE"
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
		Goals:            strPtrOrNil(in.Goals),
		PreferredDays:    strPtrOrNil(in.PreferredDays),
		PreferredTime:    strPtrOrNil(in.PreferredTime),
		Timezone:         in.Timezone,
		LocationMode:     in.LocationMode,
		Status:           booking.PrivatePending,
	}
	if err := uow.PrivateRequests().Create(ctx, req); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &in.ParentUserID, identity.AuditCreate, "private_tuition_request",
		&req.ID, nil, map[string]any{
			"student_id": in.StudentID, "subject_id": in.SubjectID,
			"status": req.Status, "request_id": in.RequestID, "trace_id": in.TraceID,
		}, in.RequestID, in.TraceID)
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return req, nil
}

// MatchPrivateTuitionRequest — admin assigns a vetted tutor to a pending
// request. This creates a PENDING_PAYMENT package and a PENDING order for the
// parent, which they settle through the normal escrow payment flow. The
// request moves to MATCHED and records the matched tutor.
func (s *BookingService) MatchPrivateTuitionRequest(ctx context.Context, adminID, requestID, tutorID uuid.UUID, totalSessions, sessionDuration int) (*MatchPrivateRequestResult, error) {
	if totalSessions < 1 {
		return nil, fmt.Errorf("%w: total_sessions must be >= 1", domain.ErrInvalidInput)
	}
	if sessionDuration < 15 {
		return nil, fmt.Errorf("%w: session_duration_minutes must be >= 15", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	req, err := uow.PrivateRequests().GetByID(ctx, requestID)
	if err != nil {
		return nil, err
	}
	if req.Status != booking.PrivatePending && req.Status != booking.PrivateMatched {
		return nil, fmt.Errorf("%w: request %s cannot be matched from status %s",
			domain.ErrConflict, req.ID, req.Status)
	}

	// Load the published rate and confirm the tutor can teach the requested subject.
	publishedRate, publishedCurrency, err := s.tutorSubject.SessionRate(ctx, tutorID)
	if err != nil {
		return nil, err
	}
	if publishedRate <= 0 {
		return nil, fmt.Errorf("%w: matched tutor has no published session rate", domain.ErrInvalidInput)
	}
	if ok, err := s.tutorSubject.TutorCanTeach(ctx, tutorID, req.SubjectID); err != nil {
		return nil, err
	} else if !ok {
		return nil, fmt.Errorf("%w: matched tutor cannot teach the requested subject", domain.ErrForbidden)
	}
	currency := publishedCurrency
	if currency == "" {
		currency = "NGN"
	}

	pkg := &booking.PrivatePackage{
		RequestID:           req.ID,
		TutorProfileID:      tutorID,
		StudentProfileID:    req.StudentProfileID,
		TotalSessions:       totalSessions,
		SessionDurationMins: sessionDuration,
		PricePerSession:     publishedRate,
		TotalPrice:          publishedRate * float64(totalSessions),
		Currency:            strings.ToUpper(currency),
		Status:              booking.PrivatePackagePendingPayment,
	}
	if err := uow.PrivatePackages().Create(ctx, pkg); err != nil {
		return nil, err
	}

	order := &payment.Order{
		ParentUserID:   req.ParentUserID,
		StudentID:      &req.StudentProfileID,
		Status:         payment.OrderPending,
		Subtotal:       pkg.TotalPrice,
		DiscountAmount: 0,
		TotalAmount:    pkg.TotalPrice,
		Currency:       pkg.Currency,
	}
	if err := uow.Orders().Create(ctx, order); err != nil {
		return nil, err
	}
	desc := fmt.Sprintf("Private tuition (matched): %d x %dmin sessions", pkg.TotalSessions, pkg.SessionDurationMins)
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
	if _, err := uow.Wallets().GetOrCreate(ctx, req.ParentUserID, order.Currency); err != nil {
		return nil, err
	}

	if err := uow.PrivateRequests().SetMatchedTutor(ctx, req.ID, tutorID); err != nil {
		return nil, err
	}
	if err := uow.PrivateRequests().UpdateStatus(ctx, req.ID, booking.PrivateMatched); err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "private_tuition_request",
		&req.ID, nil, map[string]any{
			"matched_tutor_id": tutorID, "status": booking.PrivateMatched,
			"package_id": pkg.ID, "order_id": order.ID, "total": order.TotalAmount,
		}, nil, nil)

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	req.MatchedTutorID = &tutorID
	req.Status = booking.PrivateMatched
	return &MatchPrivateRequestResult{Request: req, Package: pkg, Order: order}, nil
}

// GetPrivateTuitionRequest — owner or admin view of one request.
func (s *BookingService) GetPrivateTuitionRequest(ctx context.Context, actorUserID, requestID uuid.UUID, isAdmin bool) (*booking.PrivateTuitionRequest, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	req, err := uow.PrivateRequests().GetByID(ctx, requestID)
	if err != nil {
		return nil, err
	}
	if !isAdmin && req.ParentUserID != actorUserID {
		return nil, domain.ErrForbidden
	}
	return req, nil
}

// ListMyPrivateTuitionRequests — a parent's own requests (owner only).
func (s *BookingService) ListMyPrivateTuitionRequests(ctx context.Context, parentUserID uuid.UUID, limit int) ([]booking.PrivateTuitionRequest, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.PrivateRequests().ListByParent(ctx, parentUserID, limit)
}

// ListPrivateTuitionRequests — admin matching queue.
func (s *BookingService) ListPrivateTuitionRequests(ctx context.Context, status string, page, pageSize int) ([]booking.PrivateTuitionRequest, int64, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer uow.Rollback()
	return uow.PrivateRequests().ListAll(ctx, status, page, pageSize)
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
