package content

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AdminBlogRepository — content-management surface for the admin console
// (Phase 11). Blog posts move DRAFT → SCHEDULED → PUBLISHED → ARCHIVED with
// subject/exam tagging (SEO content engine).

type BlogListAllParams struct {
	Status   string // "", DRAFT, SCHEDULED, PUBLISHED, ARCHIVED
	Search   string
	Page     int
	PageSize int
	Sort     string
}

type AdminBlogRepository interface {
	Create(ctx context.Context, p *BlogPost) error
	Update(ctx context.Context, p *BlogPost) error
	SetStatus(ctx context.Context, id uuid.UUID, status ContentStatus) error
	GetByID(ctx context.Context, id uuid.UUID) (*BlogPost, error)
	ListAll(ctx context.Context, params BlogListAllParams) ([]BlogPost, int64, error)
	SetTags(ctx context.Context, postID uuid.UUID, subjectIDs, examIDs []uuid.UUID) error
	GetTags(ctx context.Context, postID uuid.UUID) (PostTags, error)
}

// BlogDraft — input for create/update (transport → service → repo).
type BlogDraft struct {
	Title          string
	Slug           string
	Excerpt        *string
	Content        string
	CoverImageKey  *string
	AuthorUserID   *uuid.UUID
	SeoTitle       *string
	SeoDescription *string
	CanonicalURL   *string
	Status         ContentStatus
	ScheduledAt    *time.Time
	SubjectIDs     []uuid.UUID
	ExamIDs        []uuid.UUID
}

// AdminStats — dashboard overview numbers.
type AdminStats struct {
	Users              int64   `json:"users"`
	ActiveUsers        int64   `json:"active_users"`
	TutorsTotal        int64   `json:"tutors_total"`
	TutorsApproved     int64   `json:"tutors_approved"`
	TutorsPending      int64   `json:"tutors_pending"`
	OrdersTotal        int64   `json:"orders_total"`
	OrdersPaid         int64   `json:"orders_paid"`
	RevenueInEscrow    float64 `json:"revenue_in_escrow"`
	RevenuePaidOut     float64 `json:"revenue_paid_out"`
	BlogPublished      int64   `json:"blog_published"`
	BlogDrafts         int64   `json:"blog_drafts"`
	Institutions       int64   `json:"institutions"`
	Referrals          int64   `json:"referrals"`
	ReviewsPending     int64   `json:"reviews_pending"`
	SupportOpen        int64   `json:"support_open"`
	UnresolvedDisputes int64   `json:"unresolved_disputes"`
}
