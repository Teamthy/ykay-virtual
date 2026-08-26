package memory

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/dash"
)

// DashMemory — in-memory dash.Repository for tests + dev fallback.
type DashMemory struct {
	mu       sync.RWMutex
	feedback map[string]*dash.LessonFeedback // lessonID|studentID
	prefs    map[uuid.UUID]*dash.Prefs
}

func NewDashMemory() *DashMemory {
	return &DashMemory{feedback: map[string]*dash.LessonFeedback{}, prefs: map[uuid.UUID]*dash.Prefs{}}
}

func (m *DashMemory) feedbackKey(lessonID, studentID uuid.UUID) string {
	return lessonID.String() + "|" + studentID.String()
}

func (m *DashMemory) CreateFeedback(_ context.Context, f *dash.LessonFeedback) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	f.ID = uuid.New()
	f.CreatedAt = time.Now().UTC()
	cp := *f
	m.feedback[m.feedbackKey(f.LessonID, f.StudentProfileID)] = &cp
	*f = cp
	return nil
}

func (m *DashMemory) FeedbackRating(_ context.Context, lessonID, studentID uuid.UUID) (*int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if f, ok := m.feedback[m.feedbackKey(lessonID, studentID)]; ok {
		r := f.Rating
		return &r, nil
	}
	return nil, nil
}

func (m *DashMemory) GetPrefs(_ context.Context, userID uuid.UUID) (*dash.Prefs, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.prefs[userID]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *DashMemory) UpsertPrefs(_ context.Context, p *dash.Prefs) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *p
	cp.UpdatedAt = time.Now().UTC()
	m.prefs[p.UserID] = &cp
	*p = cp
	return nil
}

func (m *DashMemory) OptedInUserIDs(_ context.Context, limit int) ([]uuid.UUID, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []uuid.UUID{}
	for uid, p := range m.prefs {
		if p.LeaderboardOptIn {
			out = append(out, uid)
		}
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out, nil
}

var _ dash.Repository = (*DashMemory)(nil)
