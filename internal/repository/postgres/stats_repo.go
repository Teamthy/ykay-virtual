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
