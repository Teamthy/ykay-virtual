package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// PortalService — the three portal read/write surfaces (Phase 11b):
// tutor availability, student assignments + submissions + attendance
// summary, and order receipts. Authorization is enforced here.

type PortalService struct {
	availability tutor.AvailabilityRepository
	assignments  booking.AssignmentRepository
	submissions  booking.SubmissionRepository
	attendance   booking.AttendanceRepository
	enrollments  booking.CohortEnrollmentRepository
	lessons      booking.LessonRepository
	orders       payment.OrderRepository
	payments     payment.PaymentRepository
	now          func() time.Time
}

func NewPortalService(availability tutor.AvailabilityRepository,
	assignments booking.AssignmentRepository, submissions booking.SubmissionRepository,
	attendance booking.AttendanceRepository, enrollments booking.CohortEnrollmentRepository,
	lessons booking.LessonRepository, orders payment.OrderRepository,
	payments payment.PaymentRepository) *PortalService {
	return &PortalService{
		availability: availability, assignments: assignments, submissions: submissions,
		attendance: attendance, enrollments: enrollments, lessons: lessons,
		orders: orders, payments: payments, now: time.Now,
	}
}

// --- Tutor availability ---

func (s *PortalService) ListAvailability(ctx context.Context, tutorProfileID uuid.UUID) ([]tutor.Availability, error) {
	if s.availability == nil {
		return []tutor.Availability{}, nil
	}
	return s.availability.ListByTutor(ctx, tutorProfileID)
}

type AvailabilityInput struct {
	TutorProfileID uuid.UUID
	DayOfWeek      int
	StartTime      string
	EndTime        string
	IsRecurring    bool
}

func (s *PortalService) UpsertAvailability(ctx context.Context, in AvailabilityInput) (*tutor.Availability, error) {
	if in.DayOfWeek < 0 || in.DayOfWeek > 6 {
		return nil, fmt.Errorf("%w: day_of_week must be 0-6", domain.ErrInvalidInput)
	}
	if in.StartTime == "" || in.EndTime == "" {
		return nil, fmt.Errorf("%w: start_time and end_time are required (HH:MM)", domain.ErrInvalidInput)
	}
	if s.availability == nil {
		return nil, errors.New("availability store unavailable")
	}
	a := &tutor.Availability{
		TutorProfileID: in.TutorProfileID,
		DayOfWeek:      in.DayOfWeek,
		StartTime:      in.StartTime,
		EndTime:        in.EndTime,
		IsRecurring:    in.IsRecurring,
	}
	if err := s.availability.Upsert(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *PortalService) DeleteAvailability(ctx context.Context, tutorProfileID, id uuid.UUID) error {
	if s.availability == nil {
		return errors.New("availability store unavailable")
	}
	return s.availability.Delete(ctx, id, tutorProfileID)
}

func (s *PortalService) ListAvailabilityExceptions(ctx context.Context, tutorProfileID uuid.UUID) ([]tutor.AvailabilityException, error) {
	if s.availability == nil {
		return []tutor.AvailabilityException{}, nil
	}
	return s.availability.ListExceptions(ctx, tutorProfileID)
}

type ExceptionInput struct {
	TutorProfileID uuid.UUID
	ExceptionDate  string // YYYY-MM-DD
	IsAvailable    bool
	StartTime      *string
	EndTime        *string
	Reason         *string
}

func (s *PortalService) UpsertAvailabilityException(ctx context.Context, in ExceptionInput) (*tutor.AvailabilityException, error) {
	d, err := time.Parse("2006-01-02", in.ExceptionDate)
	if err != nil {
		return nil, fmt.Errorf("%w: exception_date must be YYYY-MM-DD", domain.ErrInvalidInput)
	}
	if s.availability == nil {
		return nil, errors.New("availability store unavailable")
	}
	e := &tutor.AvailabilityException{
		TutorProfileID: in.TutorProfileID,
		ExceptionDate:  d,
		IsAvailable:    in.IsAvailable,
		StartTime:      in.StartTime,
		EndTime:        in.EndTime,
		Reason:         in.Reason,
	}
	if err := s.availability.UpsertException(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *PortalService) DeleteAvailabilityException(ctx context.Context, tutorProfileID, id uuid.UUID) error {
	if s.availability == nil {
		return errors.New("availability store unavailable")
	}
	return s.availability.DeleteException(ctx, id, tutorProfileID)
}

// --- Student assignments + submissions ---

// AssignmentsForStudent — assignments for cohorts the student is enrolled in.
func (s *PortalService) AssignmentsForStudent(ctx context.Context, studentProfileID uuid.UUID) ([]booking.Assignment, error) {
	if s.assignments == nil {
		return []booking.Assignment{}, nil
	}
	return s.assignments.ListByStudent(ctx, studentProfileID, 50)
}

// SubmitAssignment — student submits (idempotent upsert).
func (s *PortalService) SubmitAssignment(ctx context.Context, studentProfileID, assignmentID uuid.UUID, content *string, fileKey *string) (*booking.Submission, error) {
	if content == nil && fileKey == nil {
		return nil, fmt.Errorf("%w: submit content or a file", domain.ErrInvalidInput)
	}
	if s.submissions == nil {
		return nil, errors.New("submission store unavailable")
	}
	sub := &booking.Submission{
		AssignmentID:     assignmentID,
		StudentProfileID: studentProfileID,
		Content:          content,
		FileKey:          fileKey,
	}
	if err := s.submissions.Upsert(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *PortalService) ListMySubmissions(ctx context.Context, studentProfileID uuid.UUID) ([]booking.Submission, error) {
	if s.submissions == nil {
		return []booking.Submission{}, nil
	}
	return s.submissions.ListByStudent(ctx, studentProfileID, 50)
}

// AttendanceSummary — per-status counts for a student's lessons.
type AttendanceSummary struct {
	Total     int     `json:"total"`
	Present   int     `json:"present"`
	Absent    int     `json:"absent"`
	Late      int     `json:"late"`
	Excused   int     `json:"excused"`
	Untracked int     `json:"untracked"`
	Rate      float64 `json:"rate"` // present+late / total tracked
}

func (s *PortalService) AttendanceSummary(ctx context.Context, studentProfileID uuid.UUID) (*AttendanceSummary, error) {
	out := &AttendanceSummary{}
	if s.lessons == nil {
		return out, nil
	}
	lessons, err := s.lessons.ListByStudent(ctx, studentProfileID, 200)
	if err != nil {
		return nil, err
	}
	out.Total = len(lessons)
	if s.attendance != nil {
		rows, err := s.attendance.ListByStudent(ctx, studentProfileID)
		if err != nil {
			return nil, err
		}
		for _, a := range rows {
			switch a.Status {
			case "PRESENT":
				out.Present++
			case "ABSENT":
				out.Absent++
			case "LATE":
				out.Late++
			case "EXCUSED":
				out.Excused++
			}
		}
	}
	out.Untracked = out.Total - (out.Present + out.Absent + out.Late + out.Excused)
	tracked := out.Present + out.Late + out.Absent + out.Excused
	if tracked > 0 {
		out.Rate = float64(out.Present+out.Late) / float64(tracked) * 100
	}
	return out, nil
}

// --- Receipts (parent) ---

// OrderReceipt — order + items + payments for the parent receipts view.
type OrderReceipt struct {
	Order    payment.Order       `json:"order"`
	Items    []payment.OrderItem `json:"items"`
	Payments []payment.Payment   `json:"payments"`
}

// GetOrderReceipt — parent's own order with items + payments (authz by owner).
func (s *PortalService) GetOrderReceipt(ctx context.Context, parentUserID, orderID uuid.UUID) (*OrderReceipt, error) {
	if s.orders == nil || s.payments == nil {
		return nil, errors.New("receipt store unavailable")
	}
	order, err := s.orders.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.ParentUserID != parentUserID {
		return nil, domain.ErrForbidden
	}
	items, err := s.orders.ListItems(ctx, orderID)
	if err != nil {
		return nil, err
	}
	payments, err := s.payments.GetByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return &OrderReceipt{Order: *order, Items: items, Payments: payments}, nil
}

var _ = strings.TrimSpace
