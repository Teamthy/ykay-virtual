package memory

import (
	"context"
	"sort"
	"sync"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// In-memory teaching-ops stores (tests / dev fallback).

// --- Cohort catalogue (extends CohortMemory) ---

func (m *CohortMemory) ListPublished(_ context.Context, params booking.CohortListParams) ([]booking.Cohort, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	status := params.Status
	if status == "" {
		status = "PUBLISHED"
	}
	out := []booking.Cohort{}
	for _, c := range m.rows {
		if string(c.Status) != status {
			continue
		}
		if params.ProgrammeID != nil && c.ProgrammeID != *params.ProgrammeID {
			continue
		}
		out = append(out, *c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartDate.Before(out[j].StartDate) })
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

// --- Lesson by ID (extends LessonMemory) ---

func (m *LessonMemory) GetByID(_ context.Context, id uuid.UUID) (*booking.Lesson, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if l, ok := m.rows[id]; ok {
		cp := *l
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

// --- Lessons by cohort (extends LessonMemory) ---

func (m *LessonMemory) ListByCohort(_ context.Context, cohortID uuid.UUID, limit int) ([]booking.Lesson, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Lesson{}
	for _, l := range m.rows {
		if l.CohortID != nil && *l.CohortID == cohortID {
			out = append(out, *l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartAt.Before(out[j].StartAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

// --- Attendance ---

type AttendanceMemory struct {
	mu   sync.RWMutex
	rows map[string]*booking.Attendance // lesson|student
}

func NewAttendanceMemory() *AttendanceMemory {
	return &AttendanceMemory{rows: map[string]*booking.Attendance{}}
}

func (m *AttendanceMemory) Upsert(_ context.Context, lessonID, studentProfileID uuid.UUID, status string, markedBy uuid.UUID, note *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := lessonID.String() + "|" + studentProfileID.String()
	m.rows[key] = &booking.Attendance{
		ID: uuid.New(), LessonID: lessonID, StudentProfileID: studentProfileID,
		Status: status, MarkedBy: markedBy, Note: note, MarkedAt: nowUTC(),
	}
	return nil
}

func (m *AttendanceMemory) ListByLesson(_ context.Context, lessonID uuid.UUID) ([]booking.Attendance, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Attendance{}
	for _, a := range m.rows {
		if a.LessonID == lessonID {
			out = append(out, *a)
		}
	}
	return out, nil
}

var _ booking.AttendanceRepository = (*AttendanceMemory)(nil)

// --- Lesson notes ---

type LessonNoteMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*booking.LessonNote
}

func NewLessonNoteMemory() *LessonNoteMemory {
	return &LessonNoteMemory{rows: map[uuid.UUID]*booking.LessonNote{}}
}

func (m *LessonNoteMemory) Create(_ context.Context, n *booking.LessonNote) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	n.CreatedAt = nowUTC()
	m.rows[n.ID] = n
	return nil
}

func (m *LessonNoteMemory) ListByLesson(_ context.Context, lessonID uuid.UUID) ([]booking.LessonNote, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.LessonNote{}
	for _, n := range m.rows {
		if n.LessonID == lessonID {
			out = append(out, *n)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

var _ booking.LessonNoteRepository = (*LessonNoteMemory)(nil)

// --- Resources ---

type ResourceMemory struct {
	mu   sync.RWMutex
	rows []booking.Resource
}

func NewResourceMemory() *ResourceMemory { return &ResourceMemory{} }

func (m *ResourceMemory) Seed(r booking.Resource) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	r.CreatedAt = nowUTC()
	m.rows = append(m.rows, r)
}

func (m *ResourceMemory) ListByCohort(_ context.Context, cohortID uuid.UUID) ([]booking.Resource, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Resource{}
	for _, r := range m.rows {
		if r.CohortID != nil && *r.CohortID == cohortID {
			out = append(out, r)
		}
	}
	return out, nil
}

var _ booking.ResourceRepository = (*ResourceMemory)(nil)

// --- Assignments ---

type AssignmentMemory struct {
	mu   sync.RWMutex
	rows []booking.Assignment
}

func NewAssignmentMemory() *AssignmentMemory { return &AssignmentMemory{} }

func (m *AssignmentMemory) Seed(a booking.Assignment) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.CreatedAt = nowUTC()
	m.rows = append(m.rows, a)
}

func (m *AssignmentMemory) ListByCohort(_ context.Context, cohortID uuid.UUID) ([]booking.Assignment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.Assignment{}
	for _, a := range m.rows {
		if a.CohortID != nil && *a.CohortID == cohortID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (m *AssignmentMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Assignment, error) {
	return []booking.Assignment{}, nil
}

var _ booking.AssignmentRepository = (*AssignmentMemory)(nil)
