package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/revision"
)

// RevisionService — adaptive revision planner (feature 1). Seeds a plan from a
// learner's weak topics and rebalances weekly: weak units are promoted, mastered
// ones compressed. All decisions come from real mastery data — no predictions.
type RevisionService struct {
	repo    revision.Repository
	mastery *MasteryService
}

func NewRevisionService(repo revision.Repository) *RevisionService {
	return &RevisionService{repo: repo}
}

// WithMastery wires the mastery source used for seeding + rebalancing.
func (s *RevisionService) WithMastery(m *MasteryService) *RevisionService {
	s.mastery = m
	return s
}

func (s *RevisionService) ListPlans(ctx context.Context, studentProfileID uuid.UUID) ([]revision.Plan, error) {
	return s.repo.ListPlans(ctx, studentProfileID)
}

func (s *RevisionService) GetPlan(ctx context.Context, id uuid.UUID) (*revision.Plan, []revision.Task, error) {
	p, err := s.repo.GetPlan(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	tasks, err := s.repo.ListTasks(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return p, tasks, nil
}

// CreatePlan makes an ACTIVE plan and seeds its tasks from the learner's weak
// topics for the subject (falls back to the plan's subject when no mastery yet).
func (s *RevisionService) CreatePlan(ctx context.Context, studentProfileID uuid.UUID, subject, exam string, windowStart, windowEnd time.Time) (*revision.Plan, error) {
	if windowEnd.Before(windowStart) {
		return nil, domain.ErrInvalidInput
	}
	plan := &revision.Plan{
		StudentProfileID: studentProfileID,
		Subject:          subject,
		Exam:             exam,
		WindowStart:      windowStart,
		WindowEnd:        windowEnd,
		Status:           "ACTIVE",
	}
	if err := s.repo.CreatePlan(ctx, plan); err != nil {
		return nil, err
	}
	if err := s.seed(ctx, plan); err != nil {
		return nil, err
	}
	return plan, nil
}

// seed spreads the learner's weak topics across the window as PENDING tasks.
func (s *RevisionService) seed(ctx context.Context, plan *revision.Plan) error {
	topics := s.weakTopicNames(ctx, plan.StudentProfileID, plan.Subject)
	if len(topics) == 0 {
		return nil // no history yet — an honest empty plan, not fabricated topics
	}
	tasks := schedule(plan, topics, "seeded")
	return s.repo.AddTasks(ctx, tasks)
}

// Rebalance re-prioritises a plan's tasks from current mastery: weak units are
// promoted (priority 1), mastered ones compressed (priority 3). Idempotent.
func (s *RevisionService) Rebalance(ctx context.Context, planID uuid.UUID) (changed int, err error) {
	plan, err := s.repo.GetPlan(ctx, planID)
	if err != nil {
		return 0, err
	}
	tasks, err := s.repo.ListTasks(ctx, planID)
	if err != nil {
		return 0, err
	}
	m := s.masteryByTopic(ctx, plan.StudentProfileID, plan.Subject)
	for _, t := range tasks {
		if t.Status != "PENDING" {
			continue
		}
		prio := priorityForMastery(m[t.Topic])
		if prio != t.Priority || t.Source != "rebalanced" {
			if err := s.repo.SetTaskPriority(ctx, t.ID, prio, "rebalanced"); err != nil {
				return changed, err
			}
			changed++
		}
	}
	return changed, nil
}

func (s *RevisionService) CompleteTask(ctx context.Context, taskID uuid.UUID) error {
	return s.repo.CompleteTask(ctx, taskID)
}

func (s *RevisionService) weakTopicNames(ctx context.Context, studentProfileID uuid.UUID, subject string) []string {
	if s.mastery == nil {
		return nil
	}
	weak, err := s.mastery.WeakTopics(ctx, studentProfileID, subject, 60)
	if err != nil {
		return nil
	}
	out := make([]string, 0, len(weak))
	for _, w := range weak {
		out = append(out, w.Topic)
	}
	return out
}

func (s *RevisionService) masteryByTopic(ctx context.Context, studentProfileID uuid.UUID, subject string) map[string]int {
	out := map[string]int{}
	if s.mastery == nil {
		return out
	}
	cells, err := s.mastery.Mastery(ctx, studentProfileID, subject)
	if err != nil {
		return out
	}
	for _, c := range cells {
		out[c.Topic] = c.Mastery
	}
	return out
}

// ── pure helpers (unit-tested without a DB) ─────────────────────────────────

// schedule spreads topics evenly across the plan window as PENDING tasks.
func schedule(plan *revision.Plan, topics []string, source string) []revision.Task {
	n := len(topics)
	span := plan.WindowEnd.Sub(plan.WindowStart)
	slice := span / time.Duration(n)
	tasks := make([]revision.Task, 0, n)
	for i, topic := range topics {
		start := plan.WindowStart.Add(time.Duration(i) * slice)
		end := start.Add(slice)
		tasks = append(tasks, revision.Task{
			PlanID:      plan.ID,
			Topic:       topic,
			WindowStart: start,
			WindowEnd:   end,
			Status:      "PENDING",
			Priority:    2,
			Source:      source,
		})
	}
	return tasks
}

// priorityForMastery maps a mastery percentage to a task priority: weak topics
// are promoted (1), mastered ones compressed (3). No mastery data => 2.
func priorityForMastery(m int) int {
	switch {
	case m == 0:
		return 2 // unknown — neutral
	case m < 50:
		return 1 // weak — promote
	case m < 75:
		return 2 // developing
	default:
		return 3 // mastered — compress
	}
}
