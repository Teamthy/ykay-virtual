package memory

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// In-memory implementations of the repository interfaces. Used by unit tests
// and as a dev fallback when Postgres is unreachable. NOT for production:
// no durability, no transactions, no row locks.

// --- Subjects ---

type SubjectMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]academics.Subject
}

func NewSubjectMemory(seed []academics.Subject) *SubjectMemory {
	m := &SubjectMemory{rows: map[uuid.UUID]academics.Subject{}}
	for _, s := range seed {
		m.rows[s.ID] = s
	}
	return m
}

// Seed inserts a subject (dev-mode catalogue seeding).
func (m *SubjectMemory) Seed(s academics.Subject) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rows[s.ID] = s
}

func (m *SubjectMemory) List(_ context.Context, p academics.SubjectListParams) ([]academics.Subject, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []academics.Subject
	for _, s := range m.rows {
		if !s.IsActive {
			continue
		}
		if p.Search != "" && !strings.Contains(strings.ToLower(s.Name), strings.ToLower(p.Search)) {
			continue
		}
		if p.Category != "" && s.Category != p.Category {
			continue
		}
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	total := int64(len(out))
	start := (p.Page - 1) * p.PageSize
	if start < 0 {
		start = 0
	}
	end := start + p.PageSize
	if p.PageSize < 1 {
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

func (m *SubjectMemory) GetByID(_ context.Context, id uuid.UUID) (*academics.Subject, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.rows[id]; ok {
		cp := s
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *SubjectMemory) GetBySlug(_ context.Context, slug string) (*academics.Subject, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, s := range m.rows {
		if s.Slug == slug {
			cp := s
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

var _ academics.SubjectRepository = (*SubjectMemory)(nil)

// --- Programmes ---

type ProgrammeMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]academics.Programme
}

// ProgrammesSeed — convenience slice on MemoryStore for test seeding.
// (Declared on the store struct below; kept here for doc.)

func NewProgrammeMemory(seed []academics.Programme) *ProgrammeMemory {
	m := &ProgrammeMemory{rows: map[uuid.UUID]academics.Programme{}}
	for _, p := range seed {
		m.rows[p.ID] = p
	}
	return m
}

// Seed inserts a programme (dev-mode catalogue seeding).
func (m *ProgrammeMemory) Seed(p academics.Programme) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rows[p.ID] = p
}

func (m *ProgrammeMemory) List(_ context.Context, p academics.ProgrammeListParams) ([]academics.Programme, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []academics.Programme
	for _, pr := range m.rows {
		if pr.Status != academics.ProgrammePublished {
			continue
		}
		if p.Search != "" && !strings.Contains(strings.ToLower(pr.Title), strings.ToLower(p.Search)) {
			continue
		}
		if p.Format != "" && strings.ToUpper(string(pr.Format)) != p.Format {
			continue
		}
		if p.Featured != nil && pr.IsFeatured != *p.Featured {
			continue
		}
		out = append(out, pr)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	start := (p.Page - 1) * p.PageSize
	if start < 0 {
		start = 0
	}
	end := start + p.PageSize
	if p.PageSize < 1 {
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

func (m *ProgrammeMemory) GetBySlug(_ context.Context, slug string) (*academics.Programme, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, pr := range m.rows {
		if pr.Slug == slug {
			cp := pr
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

var _ academics.ProgrammeRepository = (*ProgrammeMemory)(nil)

// --- Tutors ---

type TutorMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]tutor.TutorSearchResult
}

func NewTutorMemory(seed []tutor.TutorSearchResult) *TutorMemory {
	m := &TutorMemory{rows: map[uuid.UUID]tutor.TutorSearchResult{}}
	for _, t := range seed {
		m.rows[t.Profile.ID] = t
	}
	return m
}

func (m *TutorMemory) Search(_ context.Context, p tutor.TutorSearchParams) ([]tutor.TutorSearchResult, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []tutor.TutorSearchResult
	for _, t := range m.rows {
		pr := t.Profile
		if pr.Status != tutor.TutorStatusApproved || !pr.IsPublic {
			continue
		}
		if p.SubjectSlug != "" && !contains(t.SubjectSlugs, p.SubjectSlug) {
			continue
		}
		if p.Location != "" && (t.LocationLabel == nil || !strings.Contains(strings.ToLower(*t.LocationLabel), strings.ToLower(p.Location))) {
			continue
		}
		if p.Online != nil && pr.AcceptsOnline != *p.Online {
			continue
		}
		if p.InPerson != nil && pr.AcceptsInPerson != *p.InPerson {
			continue
		}
		if p.MinPrice != nil && (pr.HourlyRateMin == nil || *pr.HourlyRateMin < *p.MinPrice) {
			continue
		}
		if p.MaxPrice != nil && (pr.HourlyRateMin == nil || *pr.HourlyRateMin > *p.MaxPrice) {
			continue
		}
		if p.MinRating != nil && pr.RatingAvg < *p.MinRating {
			continue
		}
		out = append(out, t)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Profile.RankingScore > out[j].Profile.RankingScore
	})
	total := int64(len(out))
	start := (p.Page - 1) * p.PageSize
	if start < 0 {
		start = 0
	}
	end := start + p.PageSize
	if p.PageSize < 1 {
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

func (m *TutorMemory) GetBySlug(_ context.Context, slug string) (*tutor.TutorProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, t := range m.rows {
		if t.Profile.Slug == slug {
			cp := t.Profile
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *TutorMemory) GetByID(_ context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if t, ok := m.rows[id]; ok {
		cp := t.Profile
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

var _ tutor.TutorRepository = (*TutorMemory)(nil)

func contains(hay []string, needle string) bool {
	for _, h := range hay {
		if h == needle {
			return true
		}
	}
	return false
}

// --- Cohorts + enrollments ---

type CohortMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*booking.Cohort
}

func NewCohortMemory(seed []*booking.Cohort) *CohortMemory {
	m := &CohortMemory{rows: map[uuid.UUID]*booking.Cohort{}}
	for _, c := range seed {
		m.rows[c.ID] = c
	}
	return m
}

func (m *CohortMemory) GetByID(_ context.Context, id uuid.UUID) (*booking.Cohort, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *CohortMemory) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*booking.Cohort, error) {
	return m.GetByID(ctx, id)
}

func (m *CohortMemory) IncrementEnrolledCount(_ context.Context, id uuid.UUID, delta int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	c.EnrolledCount += delta
	return nil
}

var _ booking.CohortRepository = (*CohortMemory)(nil)

type EnrollmentMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*booking.CohortEnrollment
}

func NewEnrollmentMemory() *EnrollmentMemory {
	return &EnrollmentMemory{rows: map[uuid.UUID]*booking.CohortEnrollment{}}
}

// Count returns confirmed enrollments — dev-mode analytics funnel.
func (m *EnrollmentMemory) Count() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var n int64
	for _, e := range m.rows {
		if e.Status == booking.EnrollmentConfirmed {
			n++
		}
	}
	return n
}

func (m *EnrollmentMemory) Create(_ context.Context, e *booking.CohortEnrollment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.EnrolledAt.IsZero() {
		e.EnrolledAt = time.Now().UTC()
	}
	m.rows[e.ID] = e
	return nil
}

func (m *EnrollmentMemory) GetByCohortAndStudent(_ context.Context, cohortID, studentProfileID uuid.UUID) (*booking.CohortEnrollment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, e := range m.rows {
		if e.CohortID == cohortID && e.StudentProfileID == studentProfileID {
			cp := *e
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *EnrollmentMemory) UpdateStatus(_ context.Context, id uuid.UUID, status booking.EnrollmentStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	e.Status = status
	return nil
}

var _ booking.CohortEnrollmentRepository = (*EnrollmentMemory)(nil)

// --- Orders / payments / webhooks / escrow / payouts / wallets ---

type OrderMemory struct {
	mu    sync.RWMutex
	rows  map[uuid.UUID]*payment.Order
	items map[uuid.UUID][]payment.OrderItem
	byKey map[string]*payment.Order
}

func NewOrderMemory() *OrderMemory {
	return &OrderMemory{rows: map[uuid.UUID]*payment.Order{}, items: map[uuid.UUID][]payment.OrderItem{}, byKey: map[string]*payment.Order{}}
}

// Stats returns (orders created, paid orders) — dev-mode analytics funnel.
func (m *OrderMemory) Stats() (orders, paid int64) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, o := range m.rows {
		orders++
		if o.Status == payment.OrderPaid {
			paid++
		}
	}
	return orders, paid
}

// RLock/RUnlock expose the order maps for dev-mode analytics aggregation.
func (m *OrderMemory) RLock()   { m.mu.RLock() }
func (m *OrderMemory) RUnlock() { m.mu.RUnlock() }

func (m *OrderMemory) Create(_ context.Context, o *payment.Order) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.OrderNumber == "" {
		o.OrderNumber = fmt.Sprintf("NUVORA-MEM-%s", uuid.NewString()[:8])
	}
	m.rows[o.ID] = o
	if o.IdempotencyKey != nil {
		m.byKey[*o.IdempotencyKey] = o
	}
	return nil
}

func (m *OrderMemory) CreateItem(_ context.Context, item *payment.OrderItem) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	m.items[item.OrderID] = append(m.items[item.OrderID], *item)
	return nil
}

func (m *OrderMemory) GetByID(_ context.Context, id uuid.UUID) (*payment.Order, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if o, ok := m.rows[id]; ok {
		cp := *o
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *OrderMemory) GetByIDempotencyKey(_ context.Context, key string) (*payment.Order, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if o, ok := m.byKey[key]; ok {
		cp := *o
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *OrderMemory) GetByNumber(_ context.Context, number string) (*payment.Order, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, o := range m.rows {
		if o.OrderNumber == number {
			cp := *o
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *OrderMemory) UpdateStatus(_ context.Context, id uuid.UUID, status payment.OrderStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	o.Status = status
	return nil
}

func (m *OrderMemory) Update(_ context.Context, o *payment.Order) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.rows[o.ID]; !ok {
		return domain.ErrNotFound
	}
	m.rows[o.ID] = o
	return nil
}

func (m *OrderMemory) ListItems(_ context.Context, orderID uuid.UUID) ([]payment.OrderItem, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	items := m.items[orderID]
	out := make([]payment.OrderItem, len(items))
	copy(out, items)
	return out, nil
}

func (m *OrderMemory) ListByParentUserID(_ context.Context, parentUserID uuid.UUID, limit, offset int) ([]payment.Order, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.Order
	for _, o := range m.rows {
		if o.ParentUserID == parentUserID {
			out = append(out, *o)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if limit < 1 {
		end = offset + 20
	}
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], total, nil
}

var _ payment.OrderRepository = (*OrderMemory)(nil)

type PaymentMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*payment.Payment
}

func NewPaymentMemory() *PaymentMemory { return &PaymentMemory{rows: map[uuid.UUID]*payment.Payment{}} }

func (m *PaymentMemory) Create(_ context.Context, p *payment.Payment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	m.rows[p.ID] = p
	return nil
}

func (m *PaymentMemory) GetByID(_ context.Context, id uuid.UUID) (*payment.Payment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.rows[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *PaymentMemory) GetByProviderReference(_ context.Context, provider payment.PaymentProvider, reference string) (*payment.Payment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.rows {
		if p.Provider == provider && p.ProviderReference != nil && *p.ProviderReference == reference {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *PaymentMemory) UpdateStatus(_ context.Context, id uuid.UUID, status payment.PaymentStatus, paidAt *time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = status
	p.PaidAt = paidAt
	return nil
}

func (m *PaymentMemory) GetByOrderID(_ context.Context, orderID uuid.UUID) ([]payment.Payment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.Payment
	for _, p := range m.rows {
		if p.OrderID == orderID {
			out = append(out, *p)
		}
	}
	return out, nil
}

var _ payment.PaymentRepository = (*PaymentMemory)(nil)

type WebhookMemory struct {
	mu   sync.RWMutex
	rows map[string]*payment.PaymentWebhook
}

func NewWebhookMemory() *WebhookMemory {
	return &WebhookMemory{rows: map[string]*payment.PaymentWebhook{}}
}

func (m *WebhookMemory) Create(_ context.Context, w *payment.PaymentWebhook) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := string(w.Provider) + ":" + w.ProviderReference
	if _, exists := m.rows[key]; exists {
		return domain.ErrAlreadyExists // mirrors UNIQUE provider_reference
	}
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	w.CreatedAt = time.Now().UTC()
	m.rows[key] = w
	return nil
}

func (m *WebhookMemory) GetByProviderReference(_ context.Context, provider payment.PaymentProvider, reference string) (*payment.PaymentWebhook, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	key := string(provider) + ":" + reference
	if w, ok := m.rows[key]; ok {
		cp := *w
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *WebhookMemory) MarkProcessed(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, w := range m.rows {
		if w.ID == id {
			w.Processed = true
			now := time.Now().UTC()
			w.ProcessedAt = &now
			return nil
		}
	}
	return domain.ErrNotFound
}

var _ payment.PaymentWebhookRepository = (*WebhookMemory)(nil)

type EscrowMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*payment.EscrowHold
}

func NewEscrowMemory() *EscrowMemory { return &EscrowMemory{rows: map[uuid.UUID]*payment.EscrowHold{}} }

func (m *EscrowMemory) Create(_ context.Context, h *payment.EscrowHold) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	h.HeldAt = time.Now().UTC()
	h.CreatedAt = h.HeldAt
	m.rows[h.ID] = h
	return nil
}

func (m *EscrowMemory) GetByID(_ context.Context, id uuid.UUID) (*payment.EscrowHold, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if h, ok := m.rows[id]; ok {
		cp := *h
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *EscrowMemory) GetByOrderID(_ context.Context, orderID uuid.UUID) ([]payment.EscrowHold, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.EscrowHold
	for _, h := range m.rows {
		if h.OrderID == orderID {
			out = append(out, *h)
		}
	}
	return out, nil
}

func (m *EscrowMemory) UpdateStatus(_ context.Context, id uuid.UUID, status payment.EscrowStatus, releasedAt *time.Time, disputeReason *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	h, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	h.Status = status
	h.ReleasedAt = releasedAt
	h.DisputeReason = disputeReason
	return nil
}

func (m *EscrowMemory) ListStaleHeld(_ context.Context, now time.Time, limit int) ([]payment.EscrowHold, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.EscrowHold
	for _, h := range m.rows {
		if h.Status == payment.EscrowHeld && h.ReleaseAt != nil && h.ReleaseAt.Before(now) {
			out = append(out, *h)
		}
	}
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *EscrowMemory) ListByTutorProfileID(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]payment.EscrowHold, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.EscrowHold
	for _, h := range m.rows {
		if h.TutorProfileID == tutorProfileID {
			out = append(out, *h)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ payment.EscrowHoldRepository = (*EscrowMemory)(nil)

type PayoutMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*payment.Payout
}

func NewPayoutMemory() *PayoutMemory { return &PayoutMemory{rows: map[uuid.UUID]*payment.Payout{}} }

func (m *PayoutMemory) Create(_ context.Context, p *payment.Payout) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = time.Now().UTC()
	m.rows[p.ID] = p
	return nil
}

func (m *PayoutMemory) GetByEscrowHoldID(_ context.Context, escrowHoldID uuid.UUID) (*payment.Payout, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.rows {
		if p.EscrowHoldID == escrowHoldID {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *PayoutMemory) ListByStatus(_ context.Context, status payment.PayoutStatus, limit int) ([]payment.Payout, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.Payout
	for _, p := range m.rows {
		if p.Status == status {
			out = append(out, *p)
		}
	}
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *PayoutMemory) UpdateStatus(_ context.Context, id uuid.UUID, status payment.PayoutStatus, providerRef *string, processedAt *time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = status
	p.ProviderReference = providerRef
	p.ProcessedAt = processedAt
	return nil
}

func (m *PayoutMemory) ListByTutorProfileID(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]payment.Payout, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []payment.Payout
	for _, p := range m.rows {
		if p.TutorProfileID == tutorProfileID {
			out = append(out, *p)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ payment.PayoutRepository = (*PayoutMemory)(nil)

type WalletMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*payment.Wallet
}

func NewWalletMemory() *WalletMemory { return &WalletMemory{rows: map[uuid.UUID]*payment.Wallet{}} }

func (m *WalletMemory) GetByUserID(_ context.Context, userID uuid.UUID) (*payment.Wallet, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if w, ok := m.rows[userID]; ok {
		cp := *w
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *WalletMemory) Create(_ context.Context, w *payment.Wallet) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	w.CreatedAt = time.Now().UTC()
	m.rows[w.UserID] = w
	return nil
}

func (m *WalletMemory) Credit(_ context.Context, userID uuid.UUID, amount float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	w, ok := m.rows[userID]
	if !ok {
		return domain.ErrNotFound
	}
	w.Balance += amount
	return nil
}

func (m *WalletMemory) GetOrCreate(_ context.Context, userID uuid.UUID, currency string) (*payment.Wallet, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if w, ok := m.rows[userID]; ok {
		cp := *w
		return &cp, nil
	}
	w := &payment.Wallet{ID: uuid.New(), UserID: userID, Balance: 0, Currency: currency, CreatedAt: time.Now().UTC()}
	m.rows[userID] = w
	cp := *w
	return &cp, nil
}

func (m *WalletMemory) Debit(_ context.Context, userID uuid.UUID, amount float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	w, ok := m.rows[userID]
	if !ok {
		return domain.ErrNotFound
	}
	if w.Balance < amount {
		return domain.ErrInsufficientBalance
	}
	w.Balance -= amount
	return nil
}

var _ payment.WalletRepository = (*WalletMemory)(nil)

// --- Student / tutor readers for object-level authz ---

type StudentLinkMemory struct{ links map[string]bool }

func NewStudentLinkMemory(links map[string]bool) *StudentLinkMemory {
	return &StudentLinkMemory{links: links}
}

func (m *StudentLinkMemory) StudentExistsForParent(_ context.Context, studentID, parentUserID uuid.UUID) (bool, error) {
	return m.links[studentID.String()+"|"+parentUserID.String()], nil
}

var _ booking.StudentProfileReader = (*StudentLinkMemory)(nil)

type TutorSubjectMemory struct {
	canTeach map[string]bool
}

func NewTutorSubjectMemory(canTeach map[string]bool) *TutorSubjectMemory {
	return &TutorSubjectMemory{canTeach: canTeach}
}

func (m *TutorSubjectMemory) TutorCanTeach(_ context.Context, tutorProfileID, subjectID uuid.UUID) (bool, error) {
	return m.canTeach[tutorProfileID.String()+"|"+subjectID.String()], nil
}

var _ booking.TutorProfileReader = (*TutorSubjectMemory)(nil)

// --- Seed helpers for tests ---

// All returns a snapshot of every cohort — dev-mode cohort analytics.
func (m *CohortMemory) All() []*booking.Cohort {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*booking.Cohort, 0, len(m.rows))
	for _, c := range m.rows {
		out = append(out, c)
	}
	return out
}

// ProgrammeOf resolves a cohort to its programme — dev-mode revenue grouping.
func (m *CohortMemory) ProgrammeOf(id uuid.UUID) uuid.UUID {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if c, ok := m.rows[id]; ok {
		return c.ProgrammeID
	}
	return uuid.Nil
}

func (m *CohortMemory) Seed(c *booking.Cohort) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	m.rows[c.ID] = c
}

// CountByStatus returns tutor profiles in the given status — dev-mode
// analytics funnel.
func (m *TutorMemory) CountByStatus(st tutor.TutorStatus) int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var n int64
	for _, t := range m.rows {
		if t.Profile.Status == st {
			n++
		}
	}
	return n
}

func (m *TutorMemory) Seed(t tutor.TutorSearchResult) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.Profile.ID == uuid.Nil {
		t.Profile.ID = uuid.New()
	}
	m.rows[t.Profile.ID] = t
}
