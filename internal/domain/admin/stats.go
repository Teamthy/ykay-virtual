package admin

import (
	"context"
)

// StatsRepository — dashboard aggregates for the operations console.
// Implementations run real SQL against the warehouse tables; the memory
// implementation serves dev fallback + tests.

type StatsRepository interface {
	Overview(ctx context.Context) (Overview, error)
	// Overview2 — extended KPIs (admin portal).
	Overview2(ctx context.Context) (Overview2, error)
}

type Overview struct {
	Users           int64   `json:"users"`
	ActiveUsers     int64   `json:"active_users"`
	TutorsTotal     int64   `json:"tutors_total"`
	TutorsApproved  int64   `json:"tutors_approved"`
	TutorsPending   int64   `json:"tutors_pending"`
	OrdersTotal     int64   `json:"orders_total"`
	OrdersPaid      int64   `json:"orders_paid"`
	RevenueInEscrow float64 `json:"revenue_in_escrow"`
	RevenuePaidOut  float64 `json:"revenue_paid_out"`
	BlogPublished   int64   `json:"blog_published"`
	BlogDrafts      int64   `json:"blog_drafts"`
	Institutions    int64   `json:"institutions"`
	Referrals       int64   `json:"referrals"`
	ReviewsPending  int64   `json:"reviews_pending"`
	SupportOpen     int64   `json:"support_open"`
	EscrowDisputed  int64   `json:"escrow_disputed"`
}

// Overview2 — extended portal KPIs (admin dashboard).
type Overview2 struct {
	Overview
	LessonsThisWeek    int64 `json:"lessons_this_week"`
	LessonsToday       int64 `json:"lessons_today"`
	CohortsPublished   int64 `json:"cohorts_published"`
	PendingEnrolments  int64 `json:"pending_enrolments"`
	OverdueLessonNotes int64 `json:"overdue_lesson_notes"`
	PendingRefunds     int64 `json:"pending_refunds"`
}
