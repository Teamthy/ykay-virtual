package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

// In-memory learning stores (tests / dev fallback).

type LearningMemory struct {
	mu                sync.RWMutex
	assessments       map[uuid.UUID]*learning.LearnerAssessment
	questions         map[uuid.UUID][]learning.AssessmentQuestion
	attempts          map[uuid.UUID]*learning.LearnerAttempt
	byStudent         map[string]*learning.LearnerAttempt // assessment|student
	reports           []learning.ProgressReport
	submissions       map[uuid.UUID][]learning.GradedSubmission // assignmentID → rows
	cohortsForStudent func(ctx context.Context, studentProfileID uuid.UUID) ([]uuid.UUID, error)
}

func NewLearningMemory() *LearningMemory {
	return &LearningMemory{
		assessments: map[uuid.UUID]*learning.LearnerAssessment{},
		questions:   map[uuid.UUID][]learning.AssessmentQuestion{},
		attempts:    map[uuid.UUID]*learning.LearnerAttempt{},
		byStudent:   map[string]*learning.LearnerAttempt{},
		submissions: map[uuid.UUID][]learning.GradedSubmission{},
	}
}

func (m *LearningMemory) CreateAssessment(_ context.Context, a *learning.LearnerAssessment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.CreatedAt = nowUTC()
	a.UpdatedAt = a.CreatedAt
	m.assessments[a.ID] = a
	return nil
}

func (m *LearningMemory) AddQuestion(_ context.Context, q *learning.AssessmentQuestion) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	m.questions[q.AssessmentID] = append(m.questions[q.AssessmentID], *q)
	return nil
}

func (m *LearningMemory) GetAssessment(_ context.Context, id uuid.UUID) (*learning.LearnerAssessment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.assessments[id]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

// WithEnrollmentLister wires the enrollment store so ListForStudent can
// resolve a learner's confirmed cohorts (dev/tests parity).
func (m *LearningMemory) WithEnrollmentLister(l func(ctx context.Context, studentProfileID uuid.UUID) ([]uuid.UUID, error)) *LearningMemory {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cohortsForStudent = l
	return m
}

func (m *LearningMemory) ListAssessmentsByTutor(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]learning.LearnerAssessment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []learning.LearnerAssessment{}
	for _, a := range m.assessments {
		if a.TutorProfileID == tutorProfileID {
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}

func (m *LearningMemory) ListForStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]learning.LearnerAssessment, error) {
	m.mu.RLock()
	hook := m.cohortsForStudent
	m.mu.RUnlock()
	cohortIDs := map[uuid.UUID]bool{}
	if hook != nil {
		if ids, err := hook(ctx, studentProfileID); err == nil {
			for _, id := range ids {
				cohortIDs[id] = true
			}
		}
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []learning.LearnerAssessment{}
	for _, a := range m.assessments {
		if a.CohortID == nil || !cohortIDs[*a.CohortID] {
			continue
		}
		if a.Status != learning.AssessmentPublished {
			continue
		}
		out = append(out, *a)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}

func (m *LearningMemory) ListByCohort(_ context.Context, cohortID uuid.UUID, status string, limit int) ([]learning.LearnerAssessment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []learning.LearnerAssessment{}
	for _, a := range m.assessments {
		if a.CohortID != nil && *a.CohortID == cohortID {
			if status != "" && string(a.Status) != status {
				continue
			}
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *LearningMemory) GetQuestions(_ context.Context, assessmentID uuid.UUID) ([]learning.AssessmentQuestion, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]learning.AssessmentQuestion, len(m.questions[assessmentID]))
	copy(out, m.questions[assessmentID])
	return out, nil
}

func (m *LearningMemory) SetStatus(_ context.Context, id uuid.UUID, status learning.AssessmentStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.assessments[id]
	if !ok {
		return domain.ErrNotFound
	}
	a.Status = status
	a.UpdatedAt = nowUTC()
	return nil
}

func (m *LearningMemory) SetDiagnostic(_ context.Context, id uuid.UUID, diagnostic bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.assessments[id]
	if !ok {
		return domain.ErrNotFound
	}
	a.IsDiagnostic = diagnostic
	a.UpdatedAt = nowUTC()
	return nil
}

func (m *LearningMemory) CreateAttempt(_ context.Context, a *learning.LearnerAttempt) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.byStudent[a.AssessmentID.String()+"|"+a.StudentProfileID.String()]; exists {
		return domain.ErrAlreadyExists
	}
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.StartedAt = nowUTC()
	m.attempts[a.ID] = a
	m.byStudent[a.AssessmentID.String()+"|"+a.StudentProfileID.String()] = a
	return nil
}

func (m *LearningMemory) GetAttempt(_ context.Context, id uuid.UUID) (*learning.LearnerAttempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.attempts[id]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *LearningMemory) GetAttemptForStudent(_ context.Context, assessmentID, studentProfileID uuid.UUID) (*learning.LearnerAttempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.byStudent[assessmentID.String()+"|"+studentProfileID.String()]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *LearningMemory) CompleteAttempt(_ context.Context, id uuid.UUID, score, maxScore float64, passed bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.attempts[id]
	if !ok {
		return domain.ErrNotFound
	}
	now := nowUTC()
	a.Status = learning.AttemptCompleted
	a.Score = &score
	a.MaxScore = &maxScore
	a.Passed = &passed
	a.CompletedAt = &now
	return nil
}

var _ learning.AssessmentRepository = (*LearningMemory)(nil)

// --- Grading ---

func (m *LearningMemory) ListSubmissionsByAssignment(_ context.Context, assignmentID uuid.UUID) ([]learning.GradedSubmission, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]learning.GradedSubmission, len(m.submissions[assignmentID]))
	copy(out, m.submissions[assignmentID])
	return out, nil
}

func (m *LearningMemory) Grade(_ context.Context, submissionID uuid.UUID, score *float64, feedback *string, gradedBy uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for assignmentID, rows := range m.submissions {
		for i := range rows {
			if rows[i].ID == submissionID {
				rows[i].Score = score
				rows[i].Feedback = feedback
				now := nowUTC()
				rows[i].GradedAt = &now
				m.submissions[assignmentID] = rows
				return nil
			}
		}
	}
	return domain.ErrNotFound
}

// SeedSubmission — test helper.
func (m *LearningMemory) SeedSubmission(s learning.GradedSubmission) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	m.submissions[s.AssignmentID] = append(m.submissions[s.AssignmentID], s)
}

var _ learning.GradingRepository = (*LearningMemory)(nil)

// --- Progress reports ---

func (m *LearningMemory) Create(_ context.Context, p *learning.ProgressReport) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = nowUTC()
	m.reports = append(m.reports, *p)
	return nil
}

func (m *LearningMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]learning.ProgressReport, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []learning.ProgressReport{}
	for _, r := range m.reports {
		if r.StudentProfileID == studentProfileID {
			out = append(out, r)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].PeriodStart.After(out[j].PeriodStart) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *LearningMemory) ListByTutor(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]learning.ProgressReport, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []learning.ProgressReport{}
	for _, r := range m.reports {
		if r.TutorProfileID == tutorProfileID {
			out = append(out, r)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ learning.ProgressReportRepository = (*LearningMemory)(nil)

// --- Analytics (memory) ---

// AnalyticsMemory — dev-mode analytics computed live from the shared
// MemoryStore (users, student profiles, orders, enrollments, cohorts,
// tutors). Programme titles for revenue grouping are unavailable in memory
// mode (postgres repo returns real titles).
type AnalyticsMemory struct {
	store *MemoryStore
}

func NewAnalyticsMemory(store *MemoryStore) *AnalyticsMemory {
	return &AnalyticsMemory{store: store}
}

func (m *AnalyticsMemory) Funnel(_ context.Context) (*learning.Funnel, error) {
	registered, _ := m.store.Users.Count()
	learners := m.store.Students.Count()
	orders, paid := m.store.Orders.Stats()
	confirmed := m.store.Enrollments.Count()
	rate := 0.0
	if registered > 0 {
		rate = float64(paid) / float64(registered) * 100
	}
	return &learning.Funnel{
		RegisteredUsers:      registered,
		LearnersCreated:      learners,
		OrdersCreated:        orders,
		PaidOrders:           paid,
		EnrollmentsConfirmed: confirmed,
		ConversionRate:       rate,
	}, nil
}

func (m *AnalyticsMemory) CohortAnalytics(_ context.Context, limit int) ([]learning.CohortAnalytics, error) {
	cohorts := m.store.Cohorts.All()
	out := make([]learning.CohortAnalytics, 0, len(cohorts))
	for _, c := range cohorts {
		fill := 0.0
		if c.Capacity > 0 {
			fill = float64(c.EnrolledCount) / float64(c.Capacity)
		}
		out = append(out, learning.CohortAnalytics{
			CohortID: c.ID, Title: c.Title, Capacity: c.Capacity,
			Enrolled: c.EnrolledCount, FillRate: fill,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].FillRate > out[j].FillRate })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *AnalyticsMemory) RevenueByProgramme(_ context.Context, limit int) ([]learning.RevenueByProgramme, error) {
	byProgramme := map[uuid.UUID]*learning.RevenueByProgramme{}
	m.store.Orders.RLock()
	for id, o := range m.store.Orders.rows {
		if o.Status != payment.OrderPaid {
			continue
		}
		for _, it := range m.store.Orders.items[id] {
			if it.ItemType != "COHORT" {
				continue
			}
			pid := m.store.Cohorts.ProgrammeOf(it.ReferenceID)
			if pid == uuid.Nil {
				continue
			}
			row, ok := byProgramme[pid]
			if !ok {
				row = &learning.RevenueByProgramme{ProgrammeID: pid}
				byProgramme[pid] = row
			}
			row.Revenue += it.TotalPrice
			row.Orders++
		}
	}
	m.store.Orders.RUnlock()
	out := make([]learning.RevenueByProgramme, 0, len(byProgramme))
	for _, row := range byProgramme {
		out = append(out, *row)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Revenue > out[j].Revenue })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ learning.AnalyticsRepository = (*AnalyticsMemory)(nil)

// ExpireStaleAttempts — worker cron (memory/dev mode).
func (m *LearningMemory) ExpireStaleAttempts(_ context.Context, before time.Time) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var n int64
	for _, a := range m.attempts {
		if a.Status == learning.AttemptInProgress && a.ExpiresAt.Before(before) {
			a.Status = learning.AttemptExpired
			n++
		}
	}
	return n, nil
}
