package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/revision"
)

// RevisionRepo — postgres implementation of revision.Repository (migration 000075).
type RevisionRepo struct{ db TxQuerier }

func NewRevisionRepo(db TxQuerier) *RevisionRepo { return &RevisionRepo{db: db} }

func (r *RevisionRepo) CreatePlan(ctx context.Context, p *revision.Plan) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO revision_plans (student_profile_id, subject, exam, window_start, window_end, status)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at, updated_at`,
		p.StudentProfileID, p.Subject, p.Exam, p.WindowStart, p.WindowEnd, p.Status).
		Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *RevisionRepo) GetPlan(ctx context.Context, id uuid.UUID) (*revision.Plan, error) {
	var p revision.Plan
	err := r.db.QueryRowContext(ctx, `
		SELECT id, student_profile_id, subject, exam, window_start, window_end, status, created_at, updated_at
		FROM revision_plans WHERE id=$1`, id).
		Scan(&p.ID, &p.StudentProfileID, &p.Subject, &p.Exam, &p.WindowStart, &p.WindowEnd, &p.Status, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get revision plan: %w", err)
	}
	return &p, nil
}

func (r *RevisionRepo) ListPlans(ctx context.Context, studentProfileID uuid.UUID) ([]revision.Plan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, student_profile_id, subject, exam, window_start, window_end, status, created_at, updated_at
		FROM revision_plans WHERE student_profile_id=$1 ORDER BY created_at DESC`, studentProfileID)
	if err != nil {
		return nil, fmt.Errorf("list revision plans: %w", err)
	}
	defer rows.Close()
	out := []revision.Plan{}
	for rows.Next() {
		var p revision.Plan
		if err := rows.Scan(&p.ID, &p.StudentProfileID, &p.Subject, &p.Exam, &p.WindowStart, &p.WindowEnd, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *RevisionRepo) AddTasks(ctx context.Context, tasks []revision.Task) error {
	for i := range tasks {
		err := r.db.QueryRowContext(ctx, `
			INSERT INTO revision_plan_tasks (plan_id, topic, window_start, window_end, status, priority, source)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING id, created_at`,
			tasks[i].PlanID, tasks[i].Topic, tasks[i].WindowStart, tasks[i].WindowEnd, tasks[i].Status, tasks[i].Priority, tasks[i].Source).
			Scan(&tasks[i].ID, &tasks[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("add revision task: %w", err)
		}
	}
	return nil
}

func (r *RevisionRepo) ListTasks(ctx context.Context, planID uuid.UUID) ([]revision.Task, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, plan_id, topic, window_start, window_end, status, priority, source, completed_at, created_at
		FROM revision_plan_tasks WHERE plan_id=$1 ORDER BY window_start`, planID)
	if err != nil {
		return nil, fmt.Errorf("list revision tasks: %w", err)
	}
	defer rows.Close()
	out := []revision.Task{}
	for rows.Next() {
		var t revision.Task
		var completedAt sql.NullTime
		if err := rows.Scan(&t.ID, &t.PlanID, &t.Topic, &t.WindowStart, &t.WindowEnd, &t.Status, &t.Priority, &t.Source, &completedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		if completedAt.Valid {
			c := completedAt.Time
			t.CompletedAt = &c
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *RevisionRepo) SetTaskPriority(ctx context.Context, taskID uuid.UUID, priority int, source string) error {
	if _, err := r.db.ExecContext(ctx,
		`UPDATE revision_plan_tasks SET priority=$2, source=$3 WHERE id=$1`, taskID, priority, source); err != nil {
		return fmt.Errorf("set task priority: %w", err)
	}
	return nil
}

func (r *RevisionRepo) CompleteTask(ctx context.Context, taskID uuid.UUID) error {
	// Idempotent: only flips PENDING -> DONE once.
	if _, err := r.db.ExecContext(ctx,
		`UPDATE revision_plan_tasks SET status='DONE', completed_at=NOW() WHERE id=$1 AND status='PENDING'`, taskID); err != nil {
		return fmt.Errorf("complete revision task: %w", err)
	}
	return nil
}

var _ revision.Repository = (*RevisionRepo)(nil)
