package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"

	"github.com/google/uuid"
)

// AdminService — operations console orchestration: overview stats, blog CMS
// (create/edit/publish with subject+exam tagging), B2B institutions list,
// referral programme list, review moderation (consent-gated publishing).
// All entry points are admin-gated at the transport layer.

type AdminService struct {
	stats        admin.StatsRepository
	blog         content.AdminBlogRepository
	institutions institution.InstitutionRepository
	referrals    referral.ReferralRepository
	reviews      review.ReviewRepository
	support      content.SupportTicketRepository
	cohortAdmin  booking.CohortAdminRepository
	lessonAdmin  booking.LessonAdminRepository
	audit        identity.AuditService
	now          func() time.Time
}

func NewAdminService(stats admin.StatsRepository, blog content.AdminBlogRepository,
	institutions institution.InstitutionRepository, referrals referral.ReferralRepository,
	reviews review.ReviewRepository, audit identity.AuditService) *AdminService {
	return &AdminService{
		stats: stats, blog: blog, institutions: institutions, referrals: referrals,
		reviews: reviews, audit: audit, now: time.Now,
	}
}

// WithSupport wires the support queue.
func (s *AdminService) WithSupport(support content.SupportTicketRepository) *AdminService {
	s.support = support
	return s
}

// WithCohortAdmin wires cohort + lesson admin management.
func (s *AdminService) WithCohortAdmin(cohorts booking.CohortAdminRepository, lessons booking.LessonAdminRepository) *AdminService {
	s.cohortAdmin = cohorts
	s.lessonAdmin = lessons
	return s
}

// --- Overview ---

func (s *AdminService) Overview(ctx context.Context) (*admin.Overview, error) {
	if s.stats == nil {
		return &admin.Overview{}, nil
	}
	o, err := s.stats.Overview(ctx)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// --- Blog CMS ---

type BlogListResult struct {
	Posts []content.BlogPost `json:"posts"`
	Total int64              `json:"total"`
}

func (s *AdminService) ListPosts(ctx context.Context, p content.BlogListAllParams) (*BlogListResult, error) {
	if s.blog == nil {
		return &BlogListResult{Posts: []content.BlogPost{}}, nil
	}
	posts, total, err := s.blog.ListAll(ctx, p)
	if err != nil {
		return nil, err
	}
	return &BlogListResult{Posts: posts, Total: total}, nil
}

// CreatePost — validates the draft (title, unique slug, content), creates the
// row with tags, audits. Publishing immediately sets published_at.
func (s *AdminService) CreatePost(ctx context.Context, adminID uuid.UUID, d content.BlogDraft) (*content.BlogPost, error) {
	if strings.TrimSpace(d.Title) == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(d.Content) == "" {
		return nil, fmt.Errorf("%w: content is required", domain.ErrInvalidInput)
	}
	if s.blog == nil {
		return nil, errors.New("blog store unavailable")
	}
	slug := strings.TrimSpace(d.Slug)
	if slug == "" {
		slug = slugify(d.Title)
	}
	status := d.Status
	if status == "" {
		status = content.StatusDraft
	}
	post := &content.BlogPost{
		Title:          strings.TrimSpace(d.Title),
		Slug:           slug,
		Excerpt:        d.Excerpt,
		Content:        d.Content,
		CoverImageKey:  d.CoverImageKey,
		AuthorUserID:   d.AuthorUserID,
		Status:         status,
		SeoTitle:       d.SeoTitle,
		SeoDescription: d.SeoDescription,
		CanonicalURL:   d.CanonicalURL,
		ScheduledAt:    d.ScheduledAt,
	}
	if status == content.StatusPublished {
		now := s.now().UTC()
		post.PublishedAt = &now
	}
	if err := s.blog.Create(ctx, post); err != nil {
		return nil, err
	}
	if len(d.SubjectIDs) > 0 || len(d.ExamIDs) > 0 {
		if err := s.blog.SetTags(ctx, post.ID, d.SubjectIDs, d.ExamIDs); err != nil {
			return nil, err
		}
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditCreate, "blog_post",
		&post.ID, nil, map[string]any{"title": post.Title, "slug": post.Slug, "status": post.Status}, nil, nil)
	return post, nil
}

// UpdatePost — edits fields + tags; keeps status transitions explicit via
// SetStatus (publish/unpublish are separate calls).
func (s *AdminService) UpdatePost(ctx context.Context, adminID uuid.UUID, postID uuid.UUID, d content.BlogDraft) (*content.BlogPost, error) {
	existing, err := s.blog.GetByID(ctx, postID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(d.Title) != "" {
		existing.Title = strings.TrimSpace(d.Title)
	}
	if strings.TrimSpace(d.Content) != "" {
		existing.Content = d.Content
	}
	if d.Excerpt != nil {
		existing.Excerpt = d.Excerpt
	}
	if d.SeoTitle != nil {
		existing.SeoTitle = d.SeoTitle
	}
	if d.SeoDescription != nil {
		existing.SeoDescription = d.SeoDescription
	}
	if d.Slug != "" {
		existing.Slug = d.Slug
	}
	existing.ScheduledAt = d.ScheduledAt
	if err := s.blog.Update(ctx, existing); err != nil {
		return nil, err
	}
	if len(d.SubjectIDs) > 0 || len(d.ExamIDs) > 0 {
		if err := s.blog.SetTags(ctx, postID, d.SubjectIDs, d.ExamIDs); err != nil {
			return nil, err
		}
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "blog_post",
		&postID, nil, map[string]any{"title": existing.Title, "action": "updated"}, nil, nil)
	return existing, nil
}

// SetPostStatus — publish / unpublish / archive / schedule. Publishing sets
// published_at once (idempotent).
func (s *AdminService) SetPostStatus(ctx context.Context, adminID uuid.UUID, postID uuid.UUID, status content.ContentStatus) error {
	if status != content.StatusDraft && status != content.StatusScheduled &&
		status != content.StatusPublished && status != content.StatusArchived {
		return fmt.Errorf("%w: invalid status", domain.ErrInvalidInput)
	}
	if err := s.blog.SetStatus(ctx, postID, status); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "blog_post",
		&postID, nil, map[string]any{"action": "status_change", "status": status}, nil, nil)
	return nil
}

// --- Institutions (B2B) ---

func (s *AdminService) ListInstitutions(ctx context.Context, p institution.InstitutionListParams) ([]institution.Institution, int64, error) {
	if s.institutions == nil {
		return []institution.Institution{}, 0, nil
	}
	return s.institutions.List(ctx, p)
}

// --- Referrals ---

func (s *AdminService) ListReferrals(ctx context.Context, p referral.ReferralListParams) ([]referral.Referral, int64, error) {
	if s.referrals == nil {
		return []referral.Referral{}, 0, nil
	}
	return s.referrals.List(ctx, p)
}

// --- Review moderation ---

// ModerateReview — publishes (consent+public), hides, or flags a review.
// Publishing a review with consent_given=false is rejected (SEO Review
// JSON-LD must only use consented reviews).
func (s *AdminService) ModerateReview(ctx context.Context, adminID uuid.UUID, reviewID uuid.UUID, status review.ReviewStatus) error {
	rv, err := s.reviews.GetByID(ctx, reviewID)
	if err != nil {
		return err
	}
	if status == review.ReviewPublished && !rv.ConsentGiven {
		return fmt.Errorf("%w: cannot publish a review without reviewer consent", domain.ErrConflict)
	}
	if status != review.ReviewPublished && status != review.ReviewHidden && status != review.ReviewFlagged && status != review.ReviewPending {
		return fmt.Errorf("%w: invalid review status", domain.ErrInvalidInput)
	}
	if err := s.reviews.UpdateStatus(ctx, reviewID, status, &adminID); err != nil {
		return err
	}
	if status == review.ReviewPublished {
		if err := s.reviews.RecomputeTutorRating(ctx, rv.TutorProfileID); err != nil {
			return err
		}
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "review",
		&reviewID, map[string]any{"status": rv.Status}, map[string]any{"status": status, "moderated_by": adminID}, nil, nil)
	return nil
}

func (s *AdminService) ListReviews(ctx context.Context, p review.ReviewListParams) ([]review.Review, int64, error) {
	if s.reviews == nil {
		return []review.Review{}, 0, nil
	}
	return s.reviews.List(ctx, p)
}

// --- Support tickets ---

type SupportService struct {
	tickets content.SupportTicketRepository
	now     func() time.Time
}

func NewSupportService(tickets content.SupportTicketRepository) *SupportService {
	return &SupportService{tickets: tickets, now: time.Now}
}

// OpenTicket — creates a support ticket (public + signed-in users).
func (s *SupportService) OpenTicket(ctx context.Context, userID *uuid.UUID, email, subject, message string) (*content.SupportTicket, error) {
	if strings.TrimSpace(email) == "" || !validEmail(email) {
		return nil, fmt.Errorf("%w: a valid email is required", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(subject) == "" || len(subject) > 255 {
		return nil, fmt.Errorf("%w: subject is required (max 255 chars)", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(message) == "" {
		return nil, fmt.Errorf("%w: message is required", domain.ErrInvalidInput)
	}
	if s.tickets == nil {
		return nil, errors.New("support store unavailable")
	}
	ticket := &content.SupportTicket{
		UserID: userID, Email: strings.TrimSpace(email),
		Subject: strings.TrimSpace(subject), Message: strings.TrimSpace(message),
		Status: "OPEN",
	}
	if err := s.tickets.Create(ctx, ticket); err != nil {
		return nil, err
	}
	return ticket, nil
}

// --- Portal extensions (Phase 11b) ---

// Overview2 — extended KPIs for the admin dashboard.
func (s *AdminService) Overview2(ctx context.Context) (*admin.Overview2, error) {
	if s.stats == nil {
		return &admin.Overview2{}, nil
	}
	o, err := s.stats.Overview2(ctx)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// ListSupportTickets — admin support queue.
func (s *AdminService) ListSupportTickets(ctx context.Context, status string, page, pageSize int) ([]content.SupportTicket, int64, error) {
	if s.support == nil {
		return []content.SupportTicket{}, 0, nil
	}
	return s.support.List(ctx, status, page, pageSize)
}

// SetSupportStatus — admin resolves/closes a ticket.
func (s *AdminService) SetSupportStatus(ctx context.Context, adminID uuid.UUID, ticketID uuid.UUID, status string) error {
	switch status {
	case "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED":
	default:
		return fmt.Errorf("%w: invalid support status", domain.ErrInvalidInput)
	}
	if err := s.support.SetStatus(ctx, ticketID, status); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "support_ticket",
		&ticketID, nil, map[string]any{"status": status}, nil, nil)
	return nil
}

// ListCohortsAdmin — all cohorts (any status) for the admin console.
func (s *AdminService) ListCohortsAdmin(ctx context.Context, status string, page, pageSize int) ([]booking.Cohort, int64, error) {
	if s.cohortAdmin == nil {
		return []booking.Cohort{}, 0, nil
	}
	return s.cohortAdmin.ListAll(ctx, booking.CohortListParams{Status: status, Page: page, PageSize: pageSize})
}

// CreateCohortAdmin — admin creates a cohort (defaults DRAFT).
func (s *AdminService) CreateCohortAdmin(ctx context.Context, adminID uuid.UUID, c *booking.Cohort) (*booking.Cohort, error) {
	if strings.TrimSpace(c.Title) == "" {
		return nil, fmt.Errorf("%w: cohort title is required", domain.ErrInvalidInput)
	}
	if c.Capacity < 1 {
		return nil, fmt.Errorf("%w: capacity must be >= 1", domain.ErrInvalidInput)
	}
	if c.Fee < 0 {
		return nil, fmt.Errorf("%w: fee must be >= 0", domain.ErrInvalidInput)
	}
	if c.Slug == "" {
		c.Slug = slugify(c.Title)
	}
	if c.Status == "" {
		c.Status = booking.CohortDraft
	}
	if c.Currency == "" {
		c.Currency = "NGN"
	}
	if c.Timezone == "" {
		c.Timezone = "Africa/Lagos"
	}
	if c.LocationMode == "" {
		c.LocationMode = "ONLINE"
	}
	c.CreatedBy = &adminID
	if err := s.cohortAdmin.Create(ctx, c); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditCreate, "cohort",
		&c.ID, nil, map[string]any{"title": c.Title, "slug": c.Slug, "status": c.Status}, nil, nil)
	return c, nil
}

// SetCohortStatusAdmin — publish/unpublish/cancel a cohort.
func (s *AdminService) SetCohortStatusAdmin(ctx context.Context, adminID uuid.UUID, cohortID uuid.UUID, status booking.CohortStatus) error {
	switch status {
	case booking.CohortDraft, booking.CohortPublished, booking.CohortCancelled, booking.CohortCompleted:
	default:
		return fmt.Errorf("%w: invalid cohort status", domain.ErrInvalidInput)
	}
	if err := s.cohortAdmin.UpdateStatus(ctx, cohortID, status); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "cohort",
		&cohortID, nil, map[string]any{"status": status}, nil, nil)
	return nil
}

// ListLessonsToday — today's classes (admin).
func (s *AdminService) ListLessonsToday(ctx context.Context) ([]booking.Lesson, error) {
	if s.lessonAdmin == nil {
		return []booking.Lesson{}, nil
	}
	return s.lessonAdmin.ListByDate(ctx, time.Now().UTC())
}
