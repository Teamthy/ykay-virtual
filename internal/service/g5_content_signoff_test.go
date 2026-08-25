package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// fakeTicketRepo — in-memory SupportTicketRepository for G5 tests.
type fakeTicketRepo struct {
	rows map[uuid.UUID]*content.SupportTicket
}

func (f *fakeTicketRepo) Create(_ context.Context, t *content.SupportTicket) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	t.CreatedAt, t.UpdatedAt = time.Now(), time.Now()
	f.rows[t.ID] = t
	return nil
}
func (f *fakeTicketRepo) GetByID(_ context.Context, id uuid.UUID) (*content.SupportTicket, error) {
	if t, ok := f.rows[id]; ok {
		return t, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeTicketRepo) SetStatus(_ context.Context, id uuid.UUID, status string) error {
	t, ok := f.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	t.Status = status
	if status == "RESOLVED" || status == "CLOSED" {
		ts := time.Now()
		t.ResolvedAt = &ts
	}
	return nil
}
func (f *fakeTicketRepo) List(_ context.Context, status string, _, _ int) ([]content.SupportTicket, int64, error) {
	var out []content.SupportTicket
	for _, t := range f.rows {
		if status == "" || t.Status == status {
			out = append(out, *t)
		}
	}
	return out, int64(len(out)), nil
}
func (f *fakeTicketRepo) ListByCategory(_ context.Context, category string, _, _ int) ([]content.SupportTicket, int64, error) {
	var out []content.SupportTicket
	for _, t := range f.rows {
		if t.Category == category {
			out = append(out, *t)
		}
	}
	return out, int64(len(out)), nil
}

func TestSupportServiceSLA(t *testing.T) {
	repo := &fakeTicketRepo{rows: map[uuid.UUID]*content.SupportTicket{}}
	svc := NewSupportService(repo)
	ctx := context.Background()

	// Safeguarding: 4h SLA, severity floored at MEDIUM.
	tk, err := svc.OpenTicketWithMeta(ctx, nil, "a@b.c", "concern", "details", "SAFEGUARDING", "LOW")
	if err != nil {
		t.Fatalf("safeguarding ticket: %v", err)
	}
	if tk.SLADueAt == nil || tk.SLADueAt.Sub(time.Now().UTC()) > 4*time.Hour+time.Minute {
		t.Fatalf("safeguarding SLA should be ~4h, got %v", tk.SLADueAt)
	}
	if tk.Severity != "MEDIUM" {
		t.Fatalf("safeguarding LOW must be floored to MEDIUM, got %s", tk.Severity)
	}
	if tk.Category != "SAFEGUARDING" {
		t.Fatalf("category = %s", tk.Category)
	}

	// URGENT general: 8h.
	tk2, err := svc.OpenTicketWithMeta(ctx, nil, "a@b.c", "pay", "msg", "FINANCE", "URGENT")
	if err != nil {
		t.Fatalf("finance ticket: %v", err)
	}
	if tk2.SLADueAt.Sub(time.Now().UTC()) > 8*time.Hour+time.Minute {
		t.Fatalf("URGENT SLA should be ~8h, got %v", tk2.SLADueAt)
	}

	// Default: 24h, LOW, GENERAL.
	tk3, err := svc.OpenTicket(ctx, nil, "a@b.c", "hi", "msg")
	if err != nil {
		t.Fatalf("default ticket: %v", err)
	}
	if tk3.SLADueAt.Sub(time.Now().UTC()) > 24*time.Hour+time.Minute {
		t.Fatalf("default SLA should be ~24h, got %v", tk3.SLADueAt)
	}
	if tk3.Category != "GENERAL" || tk3.Severity != "LOW" {
		t.Fatalf("default category/severity wrong: %s/%s", tk3.Category, tk3.Severity)
	}

	// Unknown category rejected.
	if _, err := svc.OpenTicketWithMeta(ctx, nil, "a@b.c", "x", "y", "NONSENSE", "LOW"); err == nil {
		t.Fatal("unknown category must be rejected")
	}
	// Bad severity rejected.
	if _, err := svc.OpenTicketWithMeta(ctx, nil, "a@b.c", "x", "y", "GENERAL", "EXTREME"); err == nil {
		t.Fatal("unknown severity must be rejected")
	}
}

// fakeTestimonialRepo — consent-rule fixture.
type fakeTestimonialRepo struct {
	rows map[uuid.UUID]*content.Testimonial
}

func (f *fakeTestimonialRepo) ListPublic(_ context.Context, _ bool, _ int) ([]content.Testimonial, error) {
	var out []content.Testimonial
	for _, t := range f.rows {
		if t.IsPublic && t.ConsentGiven {
			out = append(out, *t)
		}
	}
	return out, nil
}
func (f *fakeTestimonialRepo) Create(_ context.Context, t *content.Testimonial) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	f.rows[t.ID] = t
	return nil
}
func (f *fakeTestimonialRepo) GetByID(_ context.Context, id uuid.UUID) (*content.Testimonial, error) {
	if t, ok := f.rows[id]; ok {
		return t, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeTestimonialRepo) SetPublic(_ context.Context, id uuid.UUID, isPublic bool, by *uuid.UUID) error {
	t, ok := f.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	t.IsPublic = isPublic
	ts := time.Now()
	if isPublic {
		t.PublishedAt, t.PublishedBy = &ts, by
	} else {
		t.PublishedAt, t.PublishedBy = nil, nil
	}
	return nil
}

// fakeProgrammeLifecycle — G5.3 publish workflow fixture.
type fakeProgrammeLifecycle struct {
	life map[uuid.UUID]*academics.ProgrammeLifecycle
}

func (f *fakeProgrammeLifecycle) UpdateProgramme(_ context.Context, _ *academics.Programme) error {
	return nil // unused in sign-off tests; satisfies the extended interface
}

func (f *fakeProgrammeLifecycle) GetLifecycle(_ context.Context, id uuid.UUID) (*academics.ProgrammeLifecycle, error) {
	if l, ok := f.life[id]; ok {
		cp := *l
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeProgrammeLifecycle) SetLifecycle(_ context.Context, l academics.ProgrammeLifecycle) error {
	cp := l
	f.life[l.ID] = &cp
	return nil
}

func (f *fakeProgrammeLifecycle) CreateProgramme(_ context.Context, p *academics.Programme) error {
	p.ID = uuid.New()
	p.Status = academics.ProgrammeDraft
	return nil
}

// noopAudit — audit sink for unit tests.
type noopAudit struct{}

func (noopAudit) Log(context.Context, *uuid.UUID, identity.AuditAction, string, *uuid.UUID, *string, *string, *string, *string) error {
	return nil
}
func (noopAudit) LogStateChange(context.Context, *uuid.UUID, identity.AuditAction, string, *uuid.UUID, any, any, *string, *string) error {
	return nil
}

func buildG5AdminService() (*AdminService, *fakeTestimonialRepo, *fakeProgrammeLifecycle) {
	svc := NewAdminService(nil, nil, nil, nil, nil, noopAudit{})
	t := &fakeTestimonialRepo{rows: map[uuid.UUID]*content.Testimonial{}}
	p := &fakeProgrammeLifecycle{life: map[uuid.UUID]*academics.ProgrammeLifecycle{}}
	svc.WithContentSignoff(t, p)
	return svc, t, p
}

func TestTestimonialConsentRule(t *testing.T) {
	svc, repo, _ := buildG5AdminService()
	ctx := context.Background()

	unconsented := &content.Testimonial{ID: uuid.New(), AuthorName: "A", Body: "b", ConsentGiven: false}
	consented := &content.Testimonial{ID: uuid.New(), AuthorName: "B", Body: "c", ConsentGiven: true}
	_ = repo.Create(ctx, unconsented)
	_ = repo.Create(ctx, consented)

	// No consent → refuse to publish (G5.3 publication sign-off).
	if err := svc.SetTestimonialPublic(ctx, uuid.New(), unconsented.ID, true); err == nil {
		t.Fatal("unconsented testimonial must not be publishable")
	}
	// Consent on file → publishable, stamped with the publisher.
	admin := uuid.New()
	if err := svc.SetTestimonialPublic(ctx, admin, consented.ID, true); err != nil {
		t.Fatalf("consented testimonial should publish: %v", err)
	}
	if repo.rows[consented.ID].PublishedAt == nil || repo.rows[consented.ID].PublishedBy == nil {
		t.Fatal("published testimonial must record when/by whom")
	}
	// Withdraw is always allowed.
	if err := svc.SetTestimonialPublic(ctx, admin, unconsented.ID, false); err != nil {
		t.Fatalf("withdraw must not require consent: %v", err)
	}
}

func TestProgrammePublishWorkflow(t *testing.T) {
	svc, _, life := buildG5AdminService()
	c := cache.NewInMemoryCache()
	_ = c.Set(context.Background(), "programme:list:x", "cached", time.Minute)
	svc.WithCatalogueCache(c)
	ctx := context.Background()
	id := uuid.New()
	life.life[id] = &academics.ProgrammeLifecycle{ID: id, Status: academics.ProgrammeDraft}

	if err := svc.SetProgrammeStatusAdmin(ctx, uuid.New(), id, "PUBLISHED"); err != nil {
		t.Fatalf("publish: %v", err)
	}
	l := life.life[id]
	if l.Status != academics.ProgrammePublished || l.PublishedAt == nil || l.ReviewDueAt == nil {
		t.Fatalf("publish metadata missing: %+v", l)
	}
	if d := l.ReviewDueAt.Sub(*l.PublishedAt); d != 90*24*time.Hour {
		t.Fatalf("review cadence = %v, want 90d", d)
	}
	// Publishing must flush the cached catalogue (G5.3 acceptance).
	if v, _ := c.Get(ctx, "programme:list:x"); v != "" {
		t.Fatalf("catalogue cache not invalidated after publish")
	}

	if err := svc.SetProgrammeStatusAdmin(ctx, uuid.New(), id, "ARCHIVED"); err != nil {
		t.Fatalf("archive: %v", err)
	}
	l = life.life[id]
	if l.PublishedAt != nil || l.ReviewDueAt != nil {
		t.Fatalf("archive must clear workflow metadata: %+v", l)
	}
	if err := svc.SetProgrammeStatusAdmin(ctx, uuid.New(), id, "WEIRD"); err == nil {
		t.Fatal("invalid status must be rejected")
	}
	if err := svc.SetProgrammeStatusAdmin(ctx, uuid.New(), uuid.New(), "PUBLISHED"); err == nil {
		t.Fatal("unknown programme must be rejected")
	}
}
