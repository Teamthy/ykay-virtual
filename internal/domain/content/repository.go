package content

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository interfaces for the content engine (migrations 000009, 000010):
// blog posts (SEO growth channel), redirect map (slug changes → 301s),
// and the related-content graph (tutor↔subject↔programme↔blog).

type BlogListParams struct {
	Subject  string // subject slug filter
	Exam     string // exam slug filter
	Page     int
	PageSize int
	Sort     string
}

type BlogPostRepository interface {
	ListPublished(ctx context.Context, p BlogListParams) ([]BlogPost, int64, error)
	GetPublishedBySlug(ctx context.Context, slug string) (*BlogPost, error)
	// TagsForPosts returns subject + exam slugs for the given post ids.
	TagsForPosts(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID]PostTags, error)
	// RelatedBySlugs — published posts tagged with any of the subject/exam slugs.
	RelatedBySlugs(ctx context.Context, subjectSlugs, examSlugs []string, limit int) ([]BlogPost, error)
}

type PostTags struct {
	SubjectSlugs []string `json:"subject_slugs"`
	ExamSlugs    []string `json:"exam_slugs"`
}

type RedirectRepository interface {
	Lookup(ctx context.Context, fromSlug string) (*RedirectMap, error)
	Create(ctx context.Context, fromSlug, toSlug, redirectType string, createdBy *uuid.UUID) error
	List(ctx context.Context, limit int) ([]RedirectMap, error)
}

// SupportTicket — customer support enquiries (migration 000010_content).
// TicketCategory — support ticket routing (G5.2). SAFEGUARDING tickets get
// a 4h SLA and appear in the admin safeguarding queue.
type TicketCategory string

const (
	CategoryGeneral      TicketCategory = "GENERAL"
	CategorySafeguarding TicketCategory = "SAFEGUARDING"
	CategoryFinance      TicketCategory = "FINANCE"
	CategoryAcademic     TicketCategory = "ACADEMIC"
)

func ValidTicketCategory(c string) bool {
	switch TicketCategory(c) {
	case CategoryGeneral, CategorySafeguarding, CategoryFinance, CategoryAcademic:
		return true
	}
	return false
}

type SupportTicket struct {
	ID         uuid.UUID  `json:"id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	Email      string     `json:"email"`
	Subject    string     `json:"subject"`
	Message    string     `json:"message"`
	Status     string     `json:"status"`
	Category   string     `json:"category"`
	Severity   string     `json:"severity"`
	SLADueAt   *time.Time `json:"sla_due_at,omitempty"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type SupportTicketRepository interface {
	Create(ctx context.Context, t *SupportTicket) error
	GetByID(ctx context.Context, id uuid.UUID) (*SupportTicket, error)
	SetStatus(ctx context.Context, id uuid.UUID, status string) error
	List(ctx context.Context, status string, page, pageSize int) ([]SupportTicket, int64, error)
	// ListByCategory — the safeguarding/other triage queues (G5.2).
	ListByCategory(ctx context.Context, category string, page, pageSize int) ([]SupportTicket, int64, error)
}

// Testimonial — consent-gated public testimonial (migration 000010).
type TestimonialRepository interface {
	// ListPublic returns consent-given + public testimonials only (featured first).
	ListPublic(ctx context.Context, featuredOnly bool, limit int) ([]Testimonial, error)
	Create(ctx context.Context, t *Testimonial) error
	GetByID(ctx context.Context, id uuid.UUID) (*Testimonial, error)
	// SetPublic — publication sign-off (G5.3). Callers enforce the consent
	// rule before approving; the repo records when/by whom.
	SetPublic(ctx context.Context, id uuid.UUID, isPublic bool, publishedBy *uuid.UUID) error
}
