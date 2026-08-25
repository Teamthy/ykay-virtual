package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/school"

	"github.com/google/uuid"
)

// SchoolCalendarMemory â€” in-memory academic calendar store (tests / dev
// fallback). Mirrors the Postgres invariants: unique (scope, session name),
// one ACTIVE session per scope, unique (session, term number), one ACTIVE
// term per session.
type SchoolCalendarMemory struct {
	mu       sync.RWMutex
	sessions map[uuid.UUID]*school.Session
	terms    map[uuid.UUID]*school.Term
}

func NewSchoolCalendarMemory() *SchoolCalendarMemory {
	return &SchoolCalendarMemory{
		sessions: map[uuid.UUID]*school.Session{},
		terms:    map[uuid.UUID]*school.Term{},
	}
}

// scopeKey normalises the nil (platform) scope so map/index semantics match
// the migration's COALESCE indexes.
func scopeKey(institutionID *uuid.UUID) uuid.UUID {
	if institutionID == nil {
		return uuid.Nil
	}
	return *institutionID
}

func sameScope(a, b *uuid.UUID) bool { return scopeKey(a) == scopeKey(b) }

func daysOverlap(aStart, aEnd, bStart, bEnd time.Time) bool {
	// Inclusive both bounds: overlap unless one ends strictly before the
	// other starts.
	return !aEnd.Before(bStart) && !bEnd.Before(aStart)
}

func (m *SchoolCalendarMemory) CreateSession(_ context.Context, s *school.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	s.CreatedAt = now
	s.UpdatedAt = now
	if s.Status == "" {
		s.Status = school.SessionDraft
	}
	m.sessions[s.ID] = s
	return nil
}

func (m *SchoolCalendarMemory) GetSession(_ context.Context, id uuid.UUID) (*school.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.sessions[id]; ok {
		cp := *s
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *SchoolCalendarMemory) UpdateSession(_ context.Context, s *school.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.sessions[s.ID]
	if !ok {
		return domain.ErrNotFound
	}
	cur.Name = s.Name
	cur.StartsOn = s.StartsOn
	cur.EndsOn = s.EndsOn
	cur.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *SchoolCalendarMemory) SetSessionStatus(_ context.Context, id uuid.UUID, status school.SessionStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.sessions[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status == school.SessionActive {
		for _, other := range m.sessions {
			if other.ID != id && sameScope(other.InstitutionID, cur.InstitutionID) && other.Status == school.SessionActive {
				return domain.ErrConflict
			}
		}
	}
	cur.Status = status
	cur.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *SchoolCalendarMemory) ListSessions(_ context.Context, institutionID *uuid.UUID) ([]school.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []school.Session{}
	for _, s := range m.sessions {
		if sameScope(s.InstitutionID, institutionID) {
			out = append(out, *s)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *SchoolCalendarMemory) CurrentSession(_ context.Context, institutionID *uuid.UUID) (*school.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, s := range m.sessions {
		if sameScope(s.InstitutionID, institutionID) && s.Status == school.SessionActive {
			cp := *s
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *SchoolCalendarMemory) SessionsOverlap(_ context.Context, institutionID *uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, s := range m.sessions {
		if s.ID == excludeID || !sameScope(s.InstitutionID, institutionID) || s.Status == school.SessionClosed {
			continue
		}
		if daysOverlap(startsOn, endsOn, s.StartsOn, s.EndsOn) {
			return true, nil
		}
	}
	return false, nil
}

func (m *SchoolCalendarMemory) CreateTerm(_ context.Context, t *school.Term) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	if t.Status == "" {
		t.Status = school.TermUpcoming
	}
	m.terms[t.ID] = t
	return nil
}

func (m *SchoolCalendarMemory) GetTerm(_ context.Context, id uuid.UUID) (*school.Term, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if t, ok := m.terms[id]; ok {
		cp := *t
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *SchoolCalendarMemory) UpdateTerm(_ context.Context, t *school.Term) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.terms[t.ID]
	if !ok {
		return domain.ErrNotFound
	}
	for _, other := range m.terms {
		if other.ID != t.ID && other.SessionID == cur.SessionID && other.Number == t.Number {
			return domain.ErrAlreadyExists
		}
	}
	cur.Name = t.Name
	cur.Number = t.Number
	cur.StartsOn = t.StartsOn
	cur.EndsOn = t.EndsOn
	cur.EnrollmentOpensAt = t.EnrollmentOpensAt
	cur.EnrollmentClosesAt = t.EnrollmentClosesAt
	cur.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *SchoolCalendarMemory) SetTermStatus(_ context.Context, id uuid.UUID, status school.TermStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.terms[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status == school.TermActive {
		for _, other := range m.terms {
			if other.ID != id && other.SessionID == cur.SessionID && other.Status == school.TermActive {
				return domain.ErrConflict
			}
		}
	}
	cur.Status = status
	cur.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *SchoolCalendarMemory) ListTerms(_ context.Context, sessionID uuid.UUID) ([]school.Term, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []school.Term{}
	for _, t := range m.terms {
		if t.SessionID == sessionID {
			out = append(out, *t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Number < out[j].Number })
	return out, nil
}

func (m *SchoolCalendarMemory) TermsOverlap(_ context.Context, sessionID uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, t := range m.terms {
		if t.ID == excludeID || t.SessionID != sessionID {
			continue
		}
		if daysOverlap(startsOn, endsOn, t.StartsOn, t.EndsOn) {
			return true, nil
		}
	}
	return false, nil
}

func (m *SchoolCalendarMemory) CloseTermsForSession(_ context.Context, sessionID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.terms {
		if t.SessionID == sessionID && t.Status != school.TermClosed {
			t.Status = school.TermClosed
			t.UpdatedAt = time.Now().UTC()
		}
	}
	return nil
}
