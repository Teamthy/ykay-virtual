package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

// CouponMemory — in-memory coupon store (tests / dev fallback).
type CouponMemory struct {
	mu     sync.RWMutex
	rows   map[uuid.UUID]*payment.Coupon
	byCode map[string]uuid.UUID
	used   map[string]int // couponID:userID -> count
}

func NewCouponMemory() *CouponMemory {
	return &CouponMemory{rows: map[uuid.UUID]*payment.Coupon{}, byCode: map[string]uuid.UUID{}, used: map[string]int{}}
}

func (m *CouponMemory) Create(_ context.Context, c *payment.Coupon) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.CreatedAt = time.Now().UTC()
	c.UpdatedAt = c.CreatedAt
	m.rows[c.ID] = c
	m.byCode[c.Code] = c.ID
	return nil
}

func (m *CouponMemory) GetByCode(_ context.Context, code string) (*payment.Coupon, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	id, ok := m.byCode[code]
	if !ok {
		return nil, domain.ErrNotFound
	}
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *CouponMemory) GetByID(_ context.Context, id uuid.UUID) (*payment.Coupon, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *CouponMemory) List(_ context.Context, page, pageSize int) ([]payment.Coupon, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []payment.Coupon{}
	for _, c := range m.rows {
		out = append(out, *c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	limit := pageSize
	if limit < 1 {
		limit = 20
	}
	start := (page - 1) * limit
	if start < 0 {
		start = 0
	}
	if start > len(out) {
		start = len(out)
	}
	end := start + limit
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

func (m *CouponMemory) Update(_ context.Context, c *payment.Coupon) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.rows[c.ID]; !ok {
		return domain.ErrNotFound
	}
	c.UpdatedAt = time.Now().UTC()
	m.rows[c.ID] = c
	m.byCode[c.Code] = c.ID
	return nil
}

func (m *CouponMemory) IncrementUsage(_ context.Context, id uuid.UUID, by int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	c.UsedCount += by
	c.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *CouponMemory) CountUserRedemptions(_ context.Context, couponID, userID uuid.UUID) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.used[couponID.String()+"|"+userID.String()], nil
}

func (m *CouponMemory) RecordRedemption(_ context.Context, couponID, userID, _ uuid.UUID, _ float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := couponID.String() + "|" + userID.String()
	m.used[key]++
	return nil
}

var _ payment.CouponRepository = (*CouponMemory)(nil)
