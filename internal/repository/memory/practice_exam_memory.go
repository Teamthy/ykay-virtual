package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain/practice"

	"github.com/google/uuid"
)

// PracticeExamMemory — in-memory practice-exam store (tests / dev fallback).
type PracticeExamMemory struct {
	mu       sync.RWMutex
	exams    map[uuid.UUID]*practice.Exam
	attempts map[uuid.UUID]*practice.Attempt
}

func NewPracticeExamMemory() *PracticeExamMemory {
	return &PracticeExamMemory{
		exams:    map[uuid.UUID]*practice.Exam{},
		attempts: map[uuid.UUID]*practice.Attempt{},
	}
}

func cloneQuestions(in []practice.Question) []practice.Question {
	out := make([]practice.Question, len(in))
	copy(out, in)
	return out
}

func (m *PracticeExamMemory) CreateExam(_ context.Context, e *practice.Exam) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	now := time.Now().UTC()
	e.CreatedAt, e.UpdatedAt = now, now
	cp := *e
	cp.Questions = cloneQuestions(e.Questions)
	m.exams[cp.ID] = &cp
	e.ID = cp.ID
	e.CreatedAt, e.UpdatedAt = cp.CreatedAt, cp.UpdatedAt
	return nil
}

func (m *PracticeExamMemory) UpdateExam(_ context.Context, e *practice.Exam) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.exams[e.ID]
	if !ok {
		return practice.ErrNotFound
	}
	e.CreatedAt = cur.CreatedAt
	e.UpdatedAt = time.Now().UTC()
	cp := *e
	cp.Questions = cloneQuestions(e.Questions)
	m.exams[e.ID] = &cp
	return nil
}

func (m *PracticeExamMemory) DeleteExam(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.exams[id]; !ok {
		return practice.ErrNotFound
	}
	delete(m.exams, id)
	return nil
}

func (m *PracticeExamMemory) GetExam(_ context.Context, id uuid.UUID) (*practice.Exam, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	e, ok := m.exams[id]
	if !ok {
		return nil, practice.ErrNotFound
	}
	cp := *e
	cp.Questions = cloneQuestions(e.Questions)
	return &cp, nil
}

func (m *PracticeExamMemory) ListByTutor(_ context.Context, tutorID uuid.UUID) ([]practice.Exam, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []practice.Exam{}
	for _, e := range m.exams {
		if e.TutorID == tutorID {
			cp := *e
			cp.Questions = cloneQuestions(e.Questions)
			out = append(out, cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *PracticeExamMemory) ListActive(_ context.Context) ([]practice.Exam, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []practice.Exam{}
	for _, e := range m.exams {
		if e.Status == practice.StatusActive {
			cp := *e
			cp.Questions = cloneQuestions(e.Questions)
			out = append(out, cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *PracticeExamMemory) CreateAttempt(_ context.Context, a *practice.Attempt) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	cp := *a
	cp.Answers = cloneAnswers(a.Answers)
	m.attempts[cp.ID] = &cp
	a.ID = cp.ID
	return nil
}

func (m *PracticeExamMemory) UpdateAttempt(_ context.Context, a *practice.Attempt) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.attempts[a.ID]
	if !ok {
		return practice.ErrAttemptNotFound
	}
	cp := *a
	cp.StartedAt = cur.StartedAt
	cp.ExpiresAt = cur.ExpiresAt
	cp.Answers = cloneAnswers(a.Answers)
	m.attempts[a.ID] = &cp
	return nil
}

func (m *PracticeExamMemory) GetAttempt(_ context.Context, id uuid.UUID) (*practice.Attempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.attempts[id]
	if !ok {
		return nil, practice.ErrAttemptNotFound
	}
	cp := *a
	cp.Answers = cloneAnswers(a.Answers)
	return &cp, nil
}

func (m *PracticeExamMemory) ListAttemptsByStudent(_ context.Context, studentID uuid.UUID, limit int) ([]practice.Attempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []practice.Attempt{}
	for _, a := range m.attempts {
		if a.StudentID == studentID {
			cp := *a
			cp.Answers = cloneAnswers(a.Answers)
			out = append(out, cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *PracticeExamMemory) ListAttemptsByExam(_ context.Context, examID uuid.UUID, limit int) ([]practice.Attempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []practice.Attempt{}
	for _, a := range m.attempts {
		if a.ExamID == examID {
			cp := *a
			cp.Answers = cloneAnswers(a.Answers)
			out = append(out, cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func cloneAnswers(in map[string]int) map[string]int {
	if in == nil {
		return nil
	}
	out := make(map[string]int, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
