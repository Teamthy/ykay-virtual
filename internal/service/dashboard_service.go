package service

import (
	"context"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

// DashboardService — portal read models for parents, students and tutors
// (Phases 7/8-lite): orders, lessons and earnings, all authorization-scoped.

type DashboardService struct {
	orders  payment.OrderRepository
	escrow  payment.EscrowHoldRepository
	payouts payment.PayoutRepository
	lessons booking.LessonRepository
}

func NewDashboardService(
	orders payment.OrderRepository,
	escrow payment.EscrowHoldRepository,
	payouts payment.PayoutRepository,
	lessons booking.LessonRepository,
) *DashboardService {
	return &DashboardService{orders: orders, escrow: escrow, payouts: payouts, lessons: lessons}
}

// ParentOrders — the parent's orders with items (orders are already scoped to
// the parent user id by the query — no cross-tenant leak).
func (s *DashboardService) ParentOrders(ctx context.Context, parentUserID uuid.UUID, page, pageSize int) ([]payment.Order, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.orders.ListByParentUserID(ctx, parentUserID, pageSize, (page-1)*pageSize)
}

// StudentLessons — lessons for a linked student profile.
// ParentOrderView — an order enriched with the cohort the parent can
// resume payment for (checkout/{cohort_id}); the raw Order has no item
// reference, and linking checkout to the order id was a broken CTA.
type ParentOrderView struct {
	payment.Order
	CheckoutCohortID *string `json:"checkout_cohort_id,omitempty"`
}

// ParentOrdersView — ParentOrders + per-order cohort lookup for the
// pending-payment CTA (Batch 4).
func (s *DashboardService) ParentOrdersView(ctx context.Context, parentUserID uuid.UUID, page, pageSize int) ([]ParentOrderView, int64, error) {
	orders, total, err := s.ParentOrders(ctx, parentUserID, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	out := make([]ParentOrderView, 0, len(orders))
	for _, o := range orders {
		view := ParentOrderView{Order: o}
		items, ierr := s.orders.ListItems(ctx, o.ID)
		if ierr == nil {
			for _, it := range items {
				if it.ItemType == "COHORT" {
					id := it.ReferenceID.String()
					view.CheckoutCohortID = &id
					break
				}
			}
		}
		out = append(out, view)
	}
	return out, total, nil
}

func (s *DashboardService) StudentLessons(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	return s.lessons.ListByStudent(ctx, studentProfileID, limit)
}

// TutorLessons — the tutor's lesson history + schedule.
func (s *DashboardService) TutorLessons(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	return s.lessons.ListByTutor(ctx, tutorProfileID, limit)
}

// TutorEarnings — escrow holds + payouts for the tutor's profile.
type TutorEarnings struct {
	Holds         []payment.EscrowHold `json:"escrow_holds"`
	Payouts       []payment.Payout     `json:"payouts"`
	HeldTotal     float64              `json:"held_total"`
	ReleasedTotal float64              `json:"released_total"`
	PaidTotal     float64              `json:"paid_total"`
}

func (s *DashboardService) TutorEarnings(ctx context.Context, tutorProfileID uuid.UUID) (*TutorEarnings, error) {
	holds, err := s.escrow.ListByTutorProfileID(ctx, tutorProfileID, 100)
	if err != nil {
		return nil, err
	}
	payouts, err := s.payouts.ListByTutorProfileID(ctx, tutorProfileID, 100)
	if err != nil {
		return nil, err
	}
	out := &TutorEarnings{Holds: holds, Payouts: payouts}
	for _, h := range holds {
		switch h.Status {
		case payment.EscrowHeld:
			out.HeldTotal += h.Amount
		case payment.EscrowReleased:
			out.ReleasedTotal += h.Amount
		}
	}
	for _, p := range payouts {
		if p.Status == payment.PayoutPaid {
			out.PaidTotal += p.Amount
		}
	}
	return out, nil
}

var _ = time.Now
