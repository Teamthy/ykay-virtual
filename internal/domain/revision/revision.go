// Package revision — adaptive revision planner (feature 1, migration 000075).
// A plan schedules a learner's weak topics across a study window; a weekly
// rebalance promotes weak units and compresses mastered ones based on real
// mastery data. No exam predictions — only the learner's own attempt history.
package revision

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Plan — one revision plan per (learner, subject, exam) with a study window.
type Plan struct {
	ID               uuid.UUID `json:"id"`
	StudentProfileID uuid.UUID `json:"student_profile_id"`
	Subject          string    `json:"subject"`
	Exam             string    `json:"exam"`
	WindowStart      time.Time `json:"window_start"`
	WindowEnd        time.Time `json:"window_end"`
	Status           string    `json:"status"` // DRAFT|ACTIVE|ARCHIVED
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Task — one unit/topic scheduled inside a plan's window.
type Task struct {
	ID          uuid.UUID  `json:"id"`
	PlanID      uuid.UUID  `json:"plan_id"`
	Topic       string     `json:"topic"`
	WindowStart time.Time  `json:"window_start"`
	WindowEnd   time.Time  `json:"window_end"`
	Status      string     `json:"status"`   // PENDING|DONE|SKIPPED
	Priority    int        `json:"priority"` // 1 (high) .. 3 (low)
	Source      string     `json:"source"`   // seeded|rebalanced
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// Repository — persistence for revision plans + tasks.
type Repository interface {
	CreatePlan(ctx context.Context, p *Plan) error
	GetPlan(ctx context.Context, id uuid.UUID) (*Plan, error)
	ListPlans(ctx context.Context, studentProfileID uuid.UUID) ([]Plan, error)
	AddTasks(ctx context.Context, tasks []Task) error
	ListTasks(ctx context.Context, planID uuid.UUID) ([]Task, error)
	// SetTaskPriority reprioritises a task and stamps its source (rebalance).
	SetTaskPriority(ctx context.Context, taskID uuid.UUID, priority int, source string) error
	CompleteTask(ctx context.Context, taskID uuid.UUID) error
}
