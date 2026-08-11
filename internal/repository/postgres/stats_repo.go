package postgres

import (
	"context"
	"fmt"

	"ykay-virtual/internal/domain/admin"
)

// StatsRepo — single-pass SQL aggregates for the admin overview.

type StatsRepo struct{ db TxQuerier }

func NewStatsRepo(db TxQuerier) *StatsRepo { return &StatsRepo{db: db} }

func (r *StatsRepo) Overview(ctx context.Context) (admin.Overview, error) {
	var o admin.Overview

	row := func(query string, dest ...any) error {
		if err := r.db.QueryRowContext(ctx, query).Scan(dest...); err != nil {
			return err
		}
		return nil
	}

	if err := row(`SELECT
		(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM users WHERE status='ACTIVE' AND deleted_at IS NULL),
		(SELECT COUNT(*) FROM tutor_profiles),
		(SELECT COUNT(*) FROM tutor_profiles WHERE status='APPROVED'),
		(SELECT COUNT(*) FROM tutor_profiles WHERE status IN ('SUBMITTED','UNDER_REVIEW','INTERVIEW','VERIFICATION','HOLD')),
		(SELECT COUNT(*) FROM orders),
		(SELECT COUNT(*) FROM orders WHERE status='PAID'),
		COALESCE((SELECT SUM(amount) FROM escrow_holds WHERE status='HELD'),0),
		COALESCE((SELECT SUM(amount) FROM payouts WHERE status='PAID'),0),
		(SELECT COUNT(*) FROM blog_posts WHERE status='PUBLISHED'),
		(SELECT COUNT(*) FROM blog_posts WHERE status='DRAFT'),
		(SELECT COUNT(*) FROM institutions),
		(SELECT COUNT(*) FROM referrals),
		(SELECT COUNT(*) FROM reviews WHERE status='PENDING'),
		(SELECT COUNT(*) FROM support_tickets WHERE status IN ('OPEN','IN_PROGRESS')),
		(SELECT COUNT(*) FROM escrow_holds WHERE status='DISPUTED')`,
		&o.Users, &o.ActiveUsers, &o.TutorsTotal, &o.TutorsApproved, &o.TutorsPending,
		&o.OrdersTotal, &o.OrdersPaid, &o.RevenueInEscrow, &o.RevenuePaidOut,
		&o.BlogPublished, &o.BlogDrafts, &o.Institutions, &o.Referrals,
		&o.ReviewsPending, &o.SupportOpen, &o.EscrowDisputed); err != nil {
		return o, fmt.Errorf("admin overview: %w", err)
	}
	return o, nil
}

var _ admin.StatsRepository = (*StatsRepo)(nil)

func (r *StatsRepo) Overview2(ctx context.Context) (admin.Overview2, error) {
	o, err := r.Overview(ctx)
	if err != nil {
		return admin.Overview2{}, err
	}
	var o2 admin.Overview2
	o2.Overview = o
	err = r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM lessons WHERE start_at >= date_trunc('week', NOW())),
			(SELECT COUNT(*) FROM lessons WHERE start_at::date = CURRENT_DATE),
			(SELECT COUNT(*) FROM cohorts WHERE status = 'PUBLISHED'),
			(SELECT COUNT(*) FROM cohort_enrollments WHERE status = 'PENDING'),
			(SELECT COUNT(*) FROM lessons l WHERE l.status = 'COMPLETED'
			  AND NOT EXISTS (SELECT 1 FROM lesson_notes ln WHERE ln.lesson_id = l.id)),
			(SELECT COUNT(*) FROM orders WHERE status IN ('PENDING','FAILED') AND created_at > NOW() - INTERVAL '30 days')`).
		Scan(&o2.LessonsThisWeek, &o2.LessonsToday, &o2.CohortsPublished,
			&o2.PendingEnrolments, &o2.OverdueLessonNotes, &o2.PendingRefunds)
	if err != nil {
		return admin.Overview2{}, fmt.Errorf("admin overview2: %w", err)
	}
	return o2, nil
}

var _ admin.StatsRepository = (*StatsRepo)(nil)
