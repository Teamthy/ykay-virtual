package postgres

import (
	"context"
	"fmt"

	"ykay-virtual/internal/domain/learning"

	"github.com/google/uuid"
)

// AnalyticsRepo — funnel + cohort + revenue analytics (working-doc §22).

type AnalyticsRepo struct{ db TxQuerier }

func NewAnalyticsRepo(db TxQuerier) *AnalyticsRepo { return &AnalyticsRepo{db: db} }

func (r *AnalyticsRepo) Funnel(ctx context.Context) (*learning.Funnel, error) {
	var f learning.Funnel
	err := r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
			(SELECT COUNT(*) FROM student_profiles),
			(SELECT COUNT(*) FROM orders),
			(SELECT COUNT(*) FROM orders WHERE status = 'PAID'),
			(SELECT COUNT(*) FROM cohort_enrollments WHERE status = 'CONFIRMED')`).
		Scan(&f.RegisteredUsers, &f.LearnersCreated, &f.OrdersCreated, &f.PaidOrders, &f.EnrollmentsConfirmed)
	if err != nil {
		return nil, fmt.Errorf("funnel analytics: %w", err)
	}
	if f.RegisteredUsers > 0 {
		f.ConversionRate = float64(f.PaidOrders) / float64(f.RegisteredUsers) * 100
	}
	return &f, nil
}

func (r *AnalyticsRepo) CohortAnalytics(ctx context.Context, limit int) ([]learning.CohortAnalytics, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.title, c.capacity, c.enrolled_count,
			CASE WHEN c.capacity > 0 THEN ROUND(c.enrolled_count::numeric / c.capacity * 100, 1) ELSE 0 END AS fill_rate,
			(SELECT COUNT(*) FROM lessons l WHERE l.cohort_id = c.id) AS lessons_count,
			COALESCE((
				SELECT ROUND(AVG(present_rate)::numeric, 1) FROM (
					SELECT lesson_id,
						(COUNT(*) FILTER (WHERE status IN ('PRESENT','LATE')))::numeric / NULLIF(COUNT(*), 0) * 100 AS present_rate
					FROM attendance WHERE lesson_id IN (SELECT id FROM lessons WHERE cohort_id = c.id)
					GROUP BY lesson_id
				) rates
			), 0) AS attendance_rate
		FROM cohorts c
		WHERE c.status IN ('PUBLISHED','FULL','ONGOING','COMPLETED')
		ORDER BY c.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("cohort analytics: %w", err)
	}
	defer rows.Close()
	out := []learning.CohortAnalytics{}
	for rows.Next() {
		var ca learning.CohortAnalytics
		if err := rows.Scan(&ca.CohortID, &ca.Title, &ca.Capacity, &ca.Enrolled, &ca.FillRate,
			&ca.LessonsCount, &ca.AttendanceRate); err != nil {
			return nil, err
		}
		out = append(out, ca)
	}
	return out, rows.Err()
}

func (r *AnalyticsRepo) RevenueByProgramme(ctx context.Context, limit int) ([]learning.RevenueByProgramme, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.title, COALESCE(SUM(o.total_amount), 0) AS revenue, COUNT(DISTINCT o.id) AS orders
		FROM programmes p
		JOIN cohorts c ON c.programme_id = p.id
		JOIN order_items oi ON oi.item_type = 'COHORT' AND oi.reference_id = c.id
		JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID'
		GROUP BY p.id, p.title
		ORDER BY revenue DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("revenue by programme: %w", err)
	}
	defer rows.Close()
	out := []learning.RevenueByProgramme{}
	for rows.Next() {
		var rp learning.RevenueByProgramme
		if err := rows.Scan(&rp.ProgrammeID, &rp.ProgrammeTitle, &rp.Revenue, &rp.Orders); err != nil {
			return nil, err
		}
		out = append(out, rp)
	}
	return out, rows.Err()
}

var _ learning.AnalyticsRepository = (*AnalyticsRepo)(nil)
var _ = uuid.Nil
