package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/plus"
)

// PlusMemory — in-memory plus.Repository for tests + dev fallback.
type PlusMemory struct {
	mu            sync.RWMutex
	plans         map[string]*plus.Plan // by code
	subscriptions map[uuid.UUID]*plus.Subscription
	usage         map[string]int // userID|feature|day -> count
}

func NewPlusMemory() *PlusMemory {
	return &PlusMemory{
		plans:         map[string]*plus.Plan{},
		subscriptions: map[uuid.UUID]*plus.Subscription{},
		usage:         map[string]int{},
	}
}

// SeedPlan registers a plan directly (tests).
func (m *PlusMemory) SeedPlan(p *plus.Plan) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.plans[p.Code] = p
}

// SeedActive registers an active subscription (tests).
func (m *PlusMemory) SeedActive(userID uuid.UUID, planCode string, now time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.subscriptions[uuid.New()] = &plus.Subscription{
		UserID: userID, PlanCode: planCode, Status: plus.SubActive,
		StartedAt: now, EndsAt: now.AddDate(0, 1, 0),
	}
}

func (m *PlusMemory) ListPlans(_ context.Context, activeOnly bool) ([]plus.Plan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []plus.Plan{}
	for _, p := range m.plans {
		if activeOnly && !p.IsActive {
			continue
		}
		out = append(out, *p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Price < out[j].Price })
	return out, nil
}

func (m *PlusMemory) GetPlanByCode(_ context.Context, code string) (*plus.Plan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.plans[code]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *PlusMemory) GetPlanByID(_ context.Context, id uuid.UUID) (*plus.Plan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.plans {
		if p.ID == id {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *PlusMemory) UpsertPlan(_ context.Context, p *plus.Plan) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *p
	m.plans[p.Code] = &cp
	return nil
}

func (m *PlusMemory) GetActiveByUser(_ context.Context, userID uuid.UUID, now time.Time) (*plus.Subscription, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, s := range m.subscriptions {
		if s.UserID == userID && (s.Status == plus.SubActive || s.Status == plus.SubTrial) && s.EndsAt.After(now) {
			cp := *s
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *PlusMemory) Activate(_ context.Context, s *plus.Subscription) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	s.CreatedAt = now
	s.UpdatedAt = now
	cp := *s
	m.subscriptions[s.ID] = &cp
	*s = cp
	return nil
}

func (m *PlusMemory) Cancel(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.subscriptions[id]
	if !ok {
		return domain.ErrNotFound
	}
	s.Status = plus.SubCancelled
	s.AutoRenew = false
	s.EndsAt = time.Now().UTC()
	return nil
}

func (m *PlusMemory) usageKey(userID uuid.UUID, feature string, day time.Time) string {
	return userID.String() + "|" + feature + "|" + day.UTC().Format("2006-01-02")
}

func (m *PlusMemory) IncrementUsage(_ context.Context, userID uuid.UUID, feature string, day time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := m.usageKey(userID, feature, day)
	m.usage[k]++
	return m.usage[k], nil
}

func (m *PlusMemory) GetUsage(_ context.Context, userID uuid.UUID, feature string, day time.Time) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.usage[m.usageKey(userID, feature, day)], nil
}

func (m *PlusMemory) ListActiveUserIDs(_ context.Context, now time.Time) ([]uuid.UUID, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	seen := map[uuid.UUID]bool{}
	out := []uuid.UUID{}
	for _, s := range m.subscriptions {
		if (s.Status == plus.SubActive || s.Status == plus.SubTrial) && s.EndsAt.After(now) && !seen[s.UserID] {
			seen[s.UserID] = true
			out = append(out, s.UserID)
		}
	}
	return out, nil
}

func (m *PlusMemory) ExpireEnded(_ context.Context, now time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, s := range m.subscriptions {
		if (s.Status == plus.SubActive || s.Status == plus.SubTrial) && !s.EndsAt.After(now) {
			s.Status = plus.SubExpired
			s.AutoRenew = false
			n++
		}
	}
	return n, nil
}

var _ plus.Repository = (*PlusMemory)(nil)
