package memory

import (
	"context"
	"math/rand"
	"sort"
	"strings"
	"sync"

	"ykay-virtual/internal/domain/cbt"

	"github.com/google/uuid"
)

// CBTMemory — in-memory CBT bank (tests / dev fallback).
type CBTMemory struct {
	mu        sync.RWMutex
	subjects  map[uuid.UUID]*cbt.Subject
	bySlug    map[string]uuid.UUID
	questions map[uuid.UUID]*cbt.Question
}

func NewCBTMemory() *CBTMemory {
	return &CBTMemory{
		subjects:  map[uuid.UUID]*cbt.Subject{},
		bySlug:    map[string]uuid.UUID{},
		questions: map[uuid.UUID]*cbt.Question{},
	}
}

func (m *CBTMemory) ListSubjects(_ context.Context) ([]cbt.Subject, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]cbt.Subject, 0, len(m.subjects))
	for _, s := range m.subjects {
		cp := *s
		cp.QuestionCount = 0
		for _, q := range m.questions {
			if q.SubjectID == s.ID && q.Status == "published" {
				cp.QuestionCount++
			}
		}
		out = append(out, cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (m *CBTMemory) UpsertSubject(_ context.Context, s *cbt.Subject) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if id, ok := m.bySlug[s.Slug]; ok {
		m.subjects[id].Name = s.Name
		m.subjects[id].ClassLevel = s.ClassLevel
		m.subjects[id].Department = s.Department
		s.ID = id
		return nil
	}
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	cp := *s
	m.subjects[cp.ID] = &cp
	m.bySlug[cp.Slug] = cp.ID
	return nil
}

func (m *CBTMemory) random(ctx context.Context, subjectSlug string, n int) ([]cbt.Question, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	id, ok := m.bySlug[subjectSlug]
	if !ok {
		return nil, cbt.ErrNotFound
	}
	pool := make([]cbt.Question, 0)
	for _, q := range m.questions {
		if q.SubjectID == id && q.Status == "published" {
			pool = append(pool, *q)
		}
	}
	if len(pool) == 0 {
		return nil, cbt.ErrNotFound
	}
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	if n > len(pool) {
		n = len(pool)
	}
	return pool[:n], nil
}

func (m *CBTMemory) RandomQuestions(ctx context.Context, subjectSlug string, n int) ([]cbt.Question, error) {
	return m.random(ctx, subjectSlug, n)
}

func (m *CBTMemory) GetByIDs(_ context.Context, ids []uuid.UUID) ([]cbt.Question, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]cbt.Question, 0, len(ids))
	for _, id := range ids {
		if q, ok := m.questions[id]; ok && q.Status == "published" {
			cp := *q
			cp.Options = append([]string(nil), q.Options...)
			out = append(out, cp)
		}
	}
	return out, nil
}

func (m *CBTMemory) CreateQuestion(_ context.Context, q *cbt.Question, skipDuplicate bool) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, ex := range m.questions {
		if ex.SubjectID == q.SubjectID && strings.EqualFold(strings.TrimSpace(ex.Stem), strings.TrimSpace(q.Stem)) {
			if skipDuplicate {
				return false, nil
			}
			return false, cbt.ErrDuplicateStem
		}
	}
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	cp := *q
	cp.Options = append([]string(nil), q.Options...)
	m.questions[cp.ID] = &cp
	return true, nil
}

func (m *CBTMemory) ListQuestions(_ context.Context, subjectSlug string, limit, offset int) ([]cbt.Question, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var sid uuid.UUID
	if subjectSlug != "" {
		id, ok := m.bySlug[subjectSlug]
		if !ok {
			return nil, 0, cbt.ErrNotFound
		}
		sid = id
	}
	var all []cbt.Question
	for _, q := range m.questions {
		if sid != uuid.Nil && q.SubjectID != sid {
			continue
		}
		cp := *q
		cp.Options = append([]string(nil), q.Options...)
		if s, ok := m.subjects[q.SubjectID]; ok { // parity with the SQL JOIN
			cp.SubjectSlug = s.Slug
		}
		all = append(all, cp)
	}
	sort.Slice(all, func(i, j int) bool { return all[i].Stem < all[j].Stem })
	total := len(all)
	if offset > total {
		offset = total
	}
	if offset+limit > total || limit <= 0 {
		limit = total - offset
	}
	return all[offset : offset+limit], total, nil
}

func (m *CBTMemory) SetStatus(_ context.Context, id uuid.UUID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	q, ok := m.questions[id]
	if !ok {
		return cbt.ErrNotFound
	}
	q.Status = status
	return nil
}

func (m *CBTMemory) DeleteQuestion(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.questions[id]; !ok {
		return cbt.ErrNotFound
	}
	delete(m.questions, id)
	return nil
}

func (m *CBTMemory) CountPublished(_ context.Context) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	n := 0
	for _, q := range m.questions {
		if q.Status == "published" {
			n++
		}
	}
	return n, nil
}

var _ cbt.Repository = (*CBTMemory)(nil)
