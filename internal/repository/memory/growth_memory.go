package memory

import (
	"context"
	"sort"
	"sync"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"

	"github.com/google/uuid"
)

// In-memory growth stores (tests / dev fallback).

// --- Reviews (extends ReviewMemory in admin_memory.go) ---

func (m *ReviewMemory) Create(_ context.Context, rv *review.Review) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.ReviewerUserID == rv.ReviewerUserID && existing.TutorProfileID == rv.TutorProfileID {
			return domain.ErrAlreadyExists
		}
	}
	if rv.ID == uuid.Nil {
		rv.ID = uuid.New()
	}
	rv.CreatedAt = nowUTC()
	rv.UpdatedAt = rv.CreatedAt
	m.rows[rv.ID] = rv
	return nil
}

func (m *ReviewMemory) ListPublishedByTutor(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]review.Review, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []review.Review
	for _, r := range m.rows {
		if r.TutorProfileID == tutorProfileID && r.Status == review.ReviewPublished && r.IsPublic && r.ConsentGiven {
			out = append(out, *r)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *ReviewMemory) ExistsForReviewer(_ context.Context, reviewerUserID, tutorProfileID uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, r := range m.rows {
		if r.ReviewerUserID == reviewerUserID && r.TutorProfileID == tutorProfileID {
			return true, nil
		}
	}
	return false, nil
}

func (m *ReviewMemory) RecomputeTutorRating(_ context.Context, tutorProfileID uuid.UUID) error {
	// memory: no-op (tutor profile store is separate; tests assert via service)
	return nil
}

var _ review.ReviewRepository = (*ReviewMemory)(nil)

// --- Referrals ---

type ReferralMemory struct {
	mu      sync.RWMutex
	codes   map[uuid.UUID]*referral.ReferralCode
	byUser  map[uuid.UUID]*referral.ReferralCode
	byCode  map[string]*referral.ReferralCode
	rows    []referral.Referral
	rewards map[uuid.UUID]*referral.Reward
}

func NewReferralMemory() *ReferralMemory {
	return &ReferralMemory{
		codes: map[uuid.UUID]*referral.ReferralCode{}, byUser: map[uuid.UUID]*referral.ReferralCode{},
		byCode: map[string]*referral.ReferralCode{}, rewards: map[uuid.UUID]*referral.Reward{},
	}
}

func (m *ReferralMemory) CreateCode(_ context.Context, userID uuid.UUID, code string) (*referral.ReferralCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.byUser[userID]; ok {
		cp := *existing
		return &cp, nil
	}
	if _, taken := m.byCode[code]; taken {
		return nil, domain.ErrAlreadyExists
	}
	rc := &referral.ReferralCode{ID: uuid.New(), UserID: userID, Code: code, IsActive: true, CreatedAt: nowUTC()}
	m.codes[rc.ID] = rc
	m.byUser[userID] = rc
	m.byCode[code] = rc
	return rc, nil
}

func (m *ReferralMemory) GetCodeByUserID(_ context.Context, userID uuid.UUID) (*referral.ReferralCode, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if rc, ok := m.byUser[userID]; ok {
		cp := *rc
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *ReferralMemory) GetCode(_ context.Context, code string) (*referral.ReferralCode, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if rc, ok := m.byCode[code]; ok {
		cp := *rc
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *ReferralMemory) Create(_ context.Context, ref *referral.Referral) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.ReferredUserID == ref.ReferredUserID {
			return domain.ErrAlreadyExists
		}
	}
	if ref.ID == uuid.Nil {
		ref.ID = uuid.New()
	}
	ref.CreatedAt = nowUTC()
	m.rows = append(m.rows, *ref)
	return nil
}

func (m *ReferralMemory) GetByReferredUser(_ context.Context, referredUserID uuid.UUID) (*referral.Referral, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, ref := range m.rows {
		if ref.ReferredUserID == referredUserID {
			cp := ref
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *ReferralMemory) Qualify(_ context.Context, referralID, orderID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.rows {
		if m.rows[i].ID == referralID && m.rows[i].Status == "PENDING" {
			m.rows[i].Status = "QUALIFIED"
			m.rows[i].OrderID = &orderID
			m.rows[i].QualifiedAt = timePtrNow()
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *ReferralMemory) MarkRewarded(_ context.Context, referralID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.rows {
		if m.rows[i].ID == referralID {
			m.rows[i].Status = "REWARDED"
			m.rows[i].RewardedAt = timePtrNow()
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *ReferralMemory) ListByReferrer(_ context.Context, referrerUserID uuid.UUID, limit int) ([]referral.Referral, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []referral.Referral
	for _, ref := range m.rows {
		if ref.ReferrerUserID == referrerUserID {
			out = append(out, ref)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *ReferralMemory) CreateReward(_ context.Context, rw *referral.Reward) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if rw.ID == uuid.Nil {
		rw.ID = uuid.New()
	}
	rw.CreatedAt = nowUTC()
	m.rewards[rw.ID] = rw
	return nil
}

func (m *ReferralMemory) GetRewardByReferral(_ context.Context, referralID uuid.UUID) (*referral.Reward, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, rw := range m.rewards {
		if rw.ReferralID == referralID {
			cp := *rw
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *ReferralMemory) List(_ context.Context, params referral.ReferralListParams) ([]referral.Referral, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []referral.Referral
	for _, ref := range m.rows {
		if params.Status != "" && ref.Status != params.Status {
			continue
		}
		out = append(out, ref)
	}
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

func (m *ReferralMemory) Count(_ context.Context) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return int64(len(m.rows)), nil
}

var _ referral.ReferralRepository = (*ReferralMemory)(nil)

// --- Institutions (extends InstitutionMemory in admin_memory.go) ---

func (m *InstitutionMemory) Create(_ context.Context, i *institution.Institution) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.Slug == i.Slug {
			return domain.ErrAlreadyExists
		}
	}
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	i.CreatedAt = nowUTC()
	i.UpdatedAt = i.CreatedAt
	m.rows[i.ID] = i
	m.bySlug[i.Slug] = i.ID
	return nil
}

func (m *InstitutionMemory) AddMembership(_ context.Context, mem *institution.Membership) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := m.membershipKey(mem.InstitutionID, mem.UserID)
	if _, ok := m.memberships[k]; ok {
		return nil // already a member
	}
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	mem.CreatedAt = nowUTC()
	cp := *mem
	m.memberships[k] = &cp
	*mem = cp
	return nil
}

var _ institution.InstitutionRepository = (*InstitutionMemory)(nil)

// Seed helpers for tests.
func (m *ReferralMemory) Seed(r referral.Referral) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	r.CreatedAt = nowUTC()
	m.rows = append(m.rows, r)
}

func (m *ReferralMemory) SeedCode(rc *referral.ReferralCode) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if rc.ID == uuid.Nil {
		rc.ID = uuid.New()
	}
	rc.CreatedAt = nowUTC()
	m.codes[rc.ID] = rc
	m.byUser[rc.UserID] = rc
	m.byCode[rc.Code] = rc
}
