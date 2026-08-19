package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// In-memory portal stores (tests / dev fallback).

// --- Availability ---

type AvailabilityMemory struct {
	mu         sync.RWMutex
	rows       map[uuid.UUID]*tutor.Availability
	exceptions map[uuid.UUID]*tutor.AvailabilityException
}

func NewAvailabilityMemory() *AvailabilityMemory {
	return &AvailabilityMemory{rows: map[uuid.UUID]*tutor.Availability{}, exceptions: map[uuid.UUID]*tutor.AvailabilityException{}}
}

func (m *AvailabilityMemory) ListByTutor(_ context.Context, tutorProfileID uuid.UUID) ([]tutor.Availability, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []tutor.Availability{}
	for _, a := range m.rows {
		if a.TutorProfileID == tutorProfileID {
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].DayOfWeek < out[j].DayOfWeek })
	return out, nil
}

func (m *AvailabilityMemory) Upsert(_ context.Context, a *tutor.Availability) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.TutorProfileID == a.TutorProfileID && existing.DayOfWeek == a.DayOfWeek &&
			existing.StartTime == a.StartTime && existing.EndTime == a.EndTime {
			a.ID = existing.ID
			a.CreatedAt = existing.CreatedAt
			m.rows[a.ID] = a
			return nil
		}
	}
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.CreatedAt = nowUTC()
	m.rows[a.ID] = a
	return nil
}

func (m *AvailabilityMemory) Delete(_ context.Context, id uuid.UUID, tutorProfileID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok || a.TutorProfileID != tutorProfileID {
		return domain.ErrNotFound
	}
	delete(m.rows, id)
	return nil
}

func (m *AvailabilityMemory) ListExceptions(_ context.Context, tutorProfileID uuid.UUID) ([]tutor.AvailabilityException, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []tutor.AvailabilityException{}
	for _, e := range m.exceptions {
		if e.TutorProfileID == tutorProfileID {
			out = append(out, *e)
		}
	}
	return out, nil
}

func (m *AvailabilityMemory) UpsertException(_ context.Context, e *tutor.AvailabilityException) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	e.CreatedAt = nowUTC()
	m.exceptions[e.ID] = e
	return nil
}

func (m *AvailabilityMemory) DeleteException(_ context.Context, id uuid.UUID, tutorProfileID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.exceptions[id]
	if !ok || e.TutorProfileID != tutorProfileID {
		return domain.ErrNotFound
	}
	delete(m.exceptions, id)
	return nil
}

var _ tutor.AvailabilityRepository = (*AvailabilityMemory)(nil)

// --- Submissions ---

type SubmissionMemory struct {
	mu   sync.RWMutex
	rows map[string]*booking.Submission // assignment|student
}

func NewSubmissionMemory() *SubmissionMemory {
	return &SubmissionMemory{rows: map[string]*booking.Submission{}}
}

func (m *SubmissionMemory) Upsert(_ context.Context, s *booking.Submission) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := s.AssignmentID.String() + "|" + s.StudentProfileID.String()
	s.ID = uuid.New()
	s.SubmittedAt = nowUTC()
	m.rows[key] = s
	return nil
}

func (m *SubmissionMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Submission, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Submission{}
	for _, s := range m.rows {
		if s.StudentProfileID == studentProfileID {
			out = append(out, *s)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SubmittedAt.After(out[j].SubmittedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ booking.SubmissionRepository = (*SubmissionMemory)(nil)

// --- Admin cohorts (extends CohortMemory) ---

func (m *CohortMemory) ListAll(_ context.Context, params booking.CohortListParams) ([]booking.Cohort, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Cohort{}
	for _, c := range m.rows {
		if params.Status != "" && string(c.Status) != params.Status {
			continue
		}
		out = append(out, *c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	start := (params.Page - 1) * params.PageSize
	if start < 0 {
		start = 0
	}
	end := start + params.PageSize
	if params.PageSize < 1 {
		end = start + 20
	}
	if start > len(out) {
		start = len(out)
	}
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

func (m *CohortMemory) Create(_ context.Context, c *booking.Cohort) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.Slug == c.Slug {
			return domain.ErrAlreadyExists
		}
	}
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.CreatedAt = nowUTC()
	c.UpdatedAt = c.CreatedAt
	m.rows[c.ID] = c
	return nil
}

func (m *CohortMemory) UpdateStatus(_ context.Context, id uuid.UUID, status booking.CohortStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	c.Status = status
	c.UpdatedAt = nowUTC()
	return nil
}

// UpdateTutor (re)assigns or clears the tutor teaching a cohort.
func (m *CohortMemory) UpdateTutor(_ context.Context, id uuid.UUID, tutorProfileID *uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	c.TutorProfileID = tutorProfileID
	c.UpdatedAt = nowUTC()
	return nil
}

var _ booking.CohortAdminRepository = (*CohortMemory)(nil)

// --- Admin lessons (extends LessonMemory) ---

func (m *LessonMemory) ListByDate(_ context.Context, date time.Time) ([]booking.Lesson, error) {
	// memory: return all lessons (dev)
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Lesson{}
	for _, l := range m.rows {
		out = append(out, *l)
	}
	return out, nil
}

var _ booking.LessonAdminRepository = (*LessonMemory)(nil)
