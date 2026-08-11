package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/review"

	"github.com/google/uuid"
)

// In-memory admin stores (tests / dev fallback).

// --- Admin blog (wraps BlogMemory rows, adds create/update/status) ---

type AdminBlogMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*content.BlogPost
	tags map[uuid.UUID]content.PostTags
}

func NewAdminBlogMemory() *AdminBlogMemory {
	return &AdminBlogMemory{rows: map[uuid.UUID]*content.BlogPost{}, tags: map[uuid.UUID]content.PostTags{}}
}

func (m *AdminBlogMemory) Create(_ context.Context, p *content.BlogPost) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.rows {
		if existing.Slug == p.Slug {
			return domain.ErrAlreadyExists
		}
	}
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = nowUTC()
	p.UpdatedAt = p.CreatedAt
	m.rows[p.ID] = p
	return nil
}

func (m *AdminBlogMemory) Update(_ context.Context, p *content.BlogPost) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.rows[p.ID]; !ok {
		return domain.ErrNotFound
	}
	p.UpdatedAt = nowUTC()
	m.rows[p.ID] = p
	return nil
}

func (m *AdminBlogMemory) SetStatus(_ context.Context, id uuid.UUID, status content.ContentStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = status
	p.UpdatedAt = nowUTC()
	return nil
}

func (m *AdminBlogMemory) GetByID(_ context.Context, id uuid.UUID) (*content.BlogPost, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.rows[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *AdminBlogMemory) ListAll(_ context.Context, params content.BlogListAllParams) ([]content.BlogPost, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []content.BlogPost
	for _, p := range m.rows {
		if params.Status != "" && string(p.Status) != params.Status {
			continue
		}
		if params.Search != "" && !strings.Contains(strings.ToLower(p.Title), strings.ToLower(params.Search)) {
			continue
		}
		out = append(out, *p)
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

func (m *AdminBlogMemory) SetTags(_ context.Context, postID uuid.UUID, subjectIDs, examIDs []uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t := m.tags[postID]
	t.SubjectSlugs = nil
	t.ExamSlugs = nil
	for range subjectIDs {
		t.SubjectSlugs = append(t.SubjectSlugs, "subject")
	}
	for range examIDs {
		t.ExamSlugs = append(t.ExamSlugs, "exam")
	}
	m.tags[postID] = t
	return nil
}

func (m *AdminBlogMemory) GetTags(_ context.Context, postID uuid.UUID) (content.PostTags, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.tags[postID], nil
}

var _ content.AdminBlogRepository = (*AdminBlogMemory)(nil)

// --- Institutions ---

type InstitutionMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*institution.Institution
}

func NewInstitutionMemory() *InstitutionMemory {
	return &InstitutionMemory{rows: map[uuid.UUID]*institution.Institution{}}
}

func (m *InstitutionMemory) Seed(i *institution.Institution) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	m.rows[i.ID] = i
}

func (m *InstitutionMemory) List(_ context.Context, params institution.InstitutionListParams) ([]institution.Institution, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []institution.Institution
	for _, i := range m.rows {
		if params.Type != "" && string(i.Type) != params.Type {
			continue
		}
		if params.Search != "" && !strings.Contains(strings.ToLower(i.Name), strings.ToLower(params.Search)) {
			continue
		}
		out = append(out, *i)
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

func (m *InstitutionMemory) GetByID(_ context.Context, id uuid.UUID) (*institution.Institution, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if i, ok := m.rows[id]; ok {
		cp := *i
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

var _ institution.InstitutionRepository = (*InstitutionMemory)(nil)

// --- Reviews ---

type ReviewMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*review.Review
}

func NewReviewMemory() *ReviewMemory {
	return &ReviewMemory{rows: map[uuid.UUID]*review.Review{}}
}

func (m *ReviewMemory) Seed(r *review.Review) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	m.rows[r.ID] = r
}

func (m *ReviewMemory) List(_ context.Context, params review.ReviewListParams) ([]review.Review, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []review.Review
	for _, r := range m.rows {
		if params.Status != "" && string(r.Status) != params.Status {
			continue
		}
		if params.TutorID != nil && r.TutorProfileID != *params.TutorID {
			continue
		}
		out = append(out, *r)
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

func (m *ReviewMemory) GetByID(_ context.Context, id uuid.UUID) (*review.Review, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if r, ok := m.rows[id]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *ReviewMemory) UpdateStatus(_ context.Context, id uuid.UUID, status review.ReviewStatus, moderatedBy *uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	r.Status = status
	r.ModeratedBy = moderatedBy
	r.ModeratedAt = timePtrNow()
	if status == review.ReviewPublished {
		r.IsPublic = true
	}
	return nil
}

func (m *ReviewMemory) CountByStatus(_ context.Context, status review.ReviewStatus) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var n int64
	for _, r := range m.rows {
		if r.Status == status {
			n++
		}
	}
	return n, nil
}

var _ review.ReviewRepository = (*ReviewMemory)(nil)

// --- Stats ---

type StatsMemory struct {
	mu             sync.RWMutex
	users          int64
	tutorsTotal    int64
	tutorsApproved int64
	tutorsPending  int64
	ordersTotal    int64
	ordersPaid     int64
	inEscrow       float64
	paidOut        float64
	blogPublished  int64
	blogDrafts     int64
	institutions   int64
	referrals      int64
	reviewsPending int64
	supportOpen    int64
	disputed       int64
}

func NewStatsMemory() *StatsMemory { return &StatsMemory{} }

func (s *StatsMemory) Overview(_ context.Context) (admin.Overview, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return admin.Overview{
		Users: s.users, TutorsTotal: s.tutorsTotal, TutorsApproved: s.tutorsApproved,
		TutorsPending: s.tutorsPending, OrdersTotal: s.ordersTotal, OrdersPaid: s.ordersPaid,
		RevenueInEscrow: s.inEscrow, RevenuePaidOut: s.paidOut,
		BlogPublished: s.blogPublished, BlogDrafts: s.blogDrafts,
		Institutions: s.institutions, Referrals: s.referrals,
		ReviewsPending: s.reviewsPending, SupportOpen: s.supportOpen, EscrowDisputed: s.disputed,
	}, nil
}

func (s *StatsMemory) Overview2(_ context.Context) (admin.Overview2, error) {
	o, err := s.Overview(context.Background())
	if err != nil {
		return admin.Overview2{}, err
	}
	return admin.Overview2{Overview: o}, nil
}

var _ admin.StatsRepository = (*StatsMemory)(nil)

// --- Support tickets (memory) ---

type SupportMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*content.SupportTicket
}

func NewSupportMemory() *SupportMemory {
	return &SupportMemory{rows: map[uuid.UUID]*content.SupportTicket{}}
}

func (m *SupportMemory) Create(_ context.Context, t *content.SupportTicket) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	t.CreatedAt = nowUTC()
	t.UpdatedAt = t.CreatedAt
	m.rows[t.ID] = t
	return nil
}

func (m *SupportMemory) GetByID(_ context.Context, id uuid.UUID) (*content.SupportTicket, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if t, ok := m.rows[id]; ok {
		cp := *t
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *SupportMemory) SetStatus(_ context.Context, id uuid.UUID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	t.Status = status
	t.UpdatedAt = nowUTC()
	return nil
}

func (m *SupportMemory) List(_ context.Context, status string, page, pageSize int) ([]content.SupportTicket, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []content.SupportTicket
	for _, t := range m.rows {
		if status != "" && t.Status != status {
			continue
		}
		out = append(out, *t)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	if pageSize < 1 {
		pageSize = 20
	}
	start := (page - 1) * pageSize
	if start < 0 {
		start = 0
	}
	end := start + pageSize
	if start > len(out) {
		start = len(out)
	}
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

var _ content.SupportTicketRepository = (*SupportMemory)(nil)
