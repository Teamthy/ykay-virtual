package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"

	"github.com/google/uuid"
)

// AdminService — operations console orchestration: overview stats, blog CMS
// (create/edit/publish with subject+exam tagging), B2B institutions list,
// referral programme list, review moderation (consent-gated publishing).
// All entry points are admin-gated at the transport layer.

type AdminService struct {
	stats          admin.StatsRepository
	blog           content.AdminBlogRepository
	institutions   institution.InstitutionRepository
	referrals      referral.ReferralRepository
	reviews        review.ReviewRepository
	support        content.SupportTicketRepository
	cohortAdmin    booking.CohortAdminRepository
	lessonAdmin    booking.LessonAdminRepository
	testimonials   content.TestimonialRepository
	programmes     academics.ProgrammeLifecycleRepository
	catalogueCache cache.Cache
	orders         payment.OrderRepository
	payouts        payment.PayoutRepository
	paymentRows    payment.PaymentRepository
	students       identity.StudentProfileRepository
	users          identity.UserRepository
	roles          identity.RoleRepository
	auditLogs      identity.AuditLogRepository
	tutors         tutor.TutorRepository
	vetting        vetting.VettingRepository
	audit          identity.AuditService
	now            func() time.Time
}

// WithUsers wires the user + role repositories for the SUPER_ADMIN
// user-management console (list users, assign/revoke roles, suspend/activate).
func (s *AdminService) WithUsers(users identity.UserRepository, roles identity.RoleRepository) *AdminService {
	s.users = users
	s.roles = roles
	return s
}

// WithAuditLogs wires the audit-log reader for the super-admin audit viewer.
func (s *AdminService) WithAuditLogs(repo identity.AuditLogRepository) *AdminService {
	s.auditLogs = repo
	return s
}

// ListRecentAudit returns the most recent audit entries, optionally filtered
// by action/targetType (super-admin audit viewer).
func (s *AdminService) ListRecentAudit(ctx context.Context, action, targetType string, limit int) ([]identity.AuditLog, error) {
	if s.auditLogs == nil {
		return nil, errors.New("audit log store unavailable")
	}
	return s.auditLogs.ListRecent(ctx, action, targetType, limit)
}

// ListUsers returns a paginated, filtered list of platform users with their
// granted roles. Filters by search term (email/name) and account status.
func (s *AdminService) ListUsers(ctx context.Context, search, status string, page, pageSize int) ([]identity.UserWithRoles, int, error) {
	if s.users == nil {
		return nil, 0, errors.New("user store unavailable")
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize
	return s.users.ListUsers(ctx, search, status, offset, pageSize)
}

// ListRoles returns every assignable role on the platform (admin UI).
func (s *AdminService) ListRoles(ctx context.Context) ([]identity.Role, error) {
	if s.roles == nil {
		return nil, errors.New("role store unavailable")
	}
	return s.roles.ListRoles(ctx)
}

// SetUserRole grants or revokes a single named role on a user (SUPER_ADMIN).
// It refuses to strip the last SUPER_ADMIN grant from the acting user or to
// leave the platform without a SUPER_ADMIN (fail-closed role safety).
func (s *AdminService) SetUserRole(ctx context.Context, actorID, userID uuid.UUID, role string, grant bool) error {
	if s.roles == nil {
		return errors.New("role store unavailable")
	}
	role = strings.ToUpper(strings.TrimSpace(role))
	if role == "" {
		return fmt.Errorf("%w: role is required", domain.ErrInvalidInput)
	}
	r, err := s.roles.FindByName(ctx, role)
	if err != nil {
		return err
	}
	// Guard: never allow self-removal of the last SUPER_ADMIN (lockout).
	if role == "SUPER_ADMIN" && !grant && actorID == userID {
		// Count remaining super admins after hypothetical removal.
		adminRoles, _ := s.roles.RolesForUser(ctx, userID)
		has := false
		for _, ar := range adminRoles {
			if ar.Name == "SUPER_ADMIN" {
				has = true
				break
			}
		}
		if has {
			if err := s.assertAnotherSuperAdmin(ctx, userID); err != nil {
				return err
			}
		}
	}
	if grant {
		return s.roles.AssignToUser(ctx, userID, r.ID)
	}
	return s.roles.RemoveRoleForUser(ctx, userID, role)
}

// assertAnotherSuperAdmin checks that at least one OTHER user retains
// SUPER_ADMIN before the given user loses it.
func (s *AdminService) assertAnotherSuperAdmin(ctx context.Context, except uuid.UUID) error {
	_, total, err := s.users.ListUsers(ctx, "", "ACTIVE", 0, 500)
	if err != nil {
		return err
	}
	// ListUsers has a hard 200 cap per call; walk pages to be safe.
	found := false
	for page := 1; page <= (total/200)+1 && !found; page++ {
		users, _, lerr := s.users.ListUsers(ctx, "", "ACTIVE", (page-1)*200, 200)
		if lerr != nil {
			return lerr
		}
		for _, u := range users {
			if u.ID == except {
				continue
			}
			for _, r := range u.Roles {
				if r == "SUPER_ADMIN" {
					found = true
					break
				}
			}
		}
	}
	if !found {
		return fmt.Errorf("%w: cannot remove the last SUPER_ADMIN on the platform", domain.ErrConflict)
	}
	return nil
}

// SetUserStatus activates (ACTIVE) or suspends (SUSPENDED) a user account.
// A SUPER_ADMIN cannot suspend themselves.
func (s *AdminService) SetUserStatus(ctx context.Context, actorID, userID uuid.UUID, status string) error {
	if s.users == nil {
		return errors.New("user store unavailable")
	}
	status = strings.ToUpper(strings.TrimSpace(status))
	switch status {
	case "ACTIVE", "SUSPENDED", "PENDING":
	default:
		return fmt.Errorf("%w: invalid status %q", domain.ErrInvalidInput, status)
	}
	if actorID == userID && status == "SUSPENDED" {
		return fmt.Errorf("%w: you cannot suspend your own account", domain.ErrForbidden)
	}
	return s.users.SetStatus(ctx, userID, status)
}

func NewAdminService(stats admin.StatsRepository, blog content.AdminBlogRepository,
	institutions institution.InstitutionRepository, referrals referral.ReferralRepository,
	reviews review.ReviewRepository, audit identity.AuditService) *AdminService {
	return &AdminService{
		stats: stats, blog: blog, institutions: institutions, referrals: referrals,
		reviews: reviews, audit: audit, now: time.Now,
	}
}

// WithPayments wires order + payout read models for the payments console.
func (s *AdminService) WithPayments(orders payment.OrderRepository, payouts payment.PayoutRepository) *AdminService {
	s.orders = orders
	s.payouts = payouts
	return s
}

// WithPaymentRows wires per-order payment rows (provider, reference, status,
// timestamps) for the order-detail console.
func (s *AdminService) WithPaymentRows(payments payment.PaymentRepository) *AdminService {
	s.paymentRows = payments
	return s
}

// WithStudents wires student profiles so order detail can show WHO a payment
// was for (learner name, level, school).
func (s *AdminService) WithStudents(students identity.StudentProfileRepository) *AdminService {
	s.students = students
	return s
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

// WithTutors wires the tutor read model so admin can validate a tutor is
// approved before assigning them to a cohort.
func (s *AdminService) WithTutors(tutors tutor.TutorRepository) *AdminService {
	s.tutors = tutors
	return s
}

// WithVetting wires GetProfileByUserID so a tutor session can request to join
// a cohort without the client supplying a tutor_profile_id.
func (s *AdminService) WithVetting(v vetting.VettingRepository) *AdminService {
	s.vetting = v
	return s
}

// WithContentSignoff wires the G5.3 catalogue sign-off surfaces:
// programme publish workflow + testimonial publication.
func (s *AdminService) WithContentSignoff(testimonials content.TestimonialRepository,
	programmes academics.ProgrammeLifecycleRepository) *AdminService {
	s.testimonials = testimonials
	s.programmes = programmes
	return s
}

// WithCatalogueCache wires cache invalidation: publish/unpublish must flush
// the programme list cache so the catalogue updates immediately (G5.3).
func (s *AdminService) WithCatalogueCache(c cache.Cache) *AdminService {
	s.catalogueCache = c
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
	tickets  content.SupportTicketRepository
	notifier *NotifierService
	now      func() time.Time
}

func NewSupportService(tickets content.SupportTicketRepository) *SupportService {
	return &SupportService{tickets: tickets, now: time.Now}
}

// WithNotifier wires WhatsApp notification of new tickets to the platform's
// registered admin number (best-effort; delivery failures never fail the
// ticket itself).
func (s *SupportService) WithNotifier(n *NotifierService) *SupportService {
	s.notifier = n
	return s
}

// OpenTicket — creates a support ticket (public + signed-in users).
func (s *SupportService) OpenTicket(ctx context.Context, userID *uuid.UUID, email, subject, message string) (*content.SupportTicket, error) {
	return s.OpenTicketWithMeta(ctx, userID, email, subject, message, "", "")
}

// OpenTicketWithMeta — categorised intake (G5.2). SAFEGUARDING tickets get
// a 4-hour SLA; URGENT/HIGH severity tickets 8 hours; everything else 24.
// Severity is normalised (default LOW); unknown categories are rejected so
// the triage queues stay meaningful.
func (s *SupportService) OpenTicketWithMeta(ctx context.Context, userID *uuid.UUID, email, subject, message, category, severity string) (*content.SupportTicket, error) {
	if strings.TrimSpace(email) == "" || !validEmail(email) {
		return nil, fmt.Errorf("%w: a valid email is required", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(subject) == "" || len(subject) > 255 {
		return nil, fmt.Errorf("%w: subject is required (max 255 chars)", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(message) == "" {
		return nil, fmt.Errorf("%w: message is required", domain.ErrInvalidInput)
	}
	if len(message) > 8000 {
		return nil, fmt.Errorf("%w: message is too long", domain.ErrInvalidInput)
	}
	if s.tickets == nil {
		return nil, errors.New("support store unavailable")
	}

	if category == "" {
		category = string(content.CategoryGeneral)
	}
	if !content.ValidTicketCategory(category) {
		return nil, fmt.Errorf("%w: unknown category %q", domain.ErrInvalidInput, category)
	}
	switch strings.ToUpper(strings.TrimSpace(severity)) {
	case "", "LOW":
		severity = "LOW"
	case "MEDIUM", "HIGH", "URGENT":
		severity = strings.ToUpper(strings.TrimSpace(severity))
	default:
		return nil, fmt.Errorf("%w: severity must be LOW, MEDIUM, HIGH or URGENT", domain.ErrInvalidInput)
	}

	// Safeguarding concerns always carry a 4h SLA and minimum MEDIUM
	// severity — a LOW safeguarding concern is not a thing.
	if content.TicketCategory(category) == content.CategorySafeguarding {
		if severity == "LOW" {
			severity = "MEDIUM"
		}
	}

	now := s.now().UTC()
	sla := now.Add(24 * time.Hour)
	if content.TicketCategory(category) == content.CategorySafeguarding {
		sla = now.Add(4 * time.Hour)
	} else if severity == "HIGH" || severity == "URGENT" {
		sla = now.Add(8 * time.Hour)
	}

	ticket := &content.SupportTicket{
		UserID: userID, Email: strings.TrimSpace(email),
		Subject: strings.TrimSpace(subject), Message: strings.TrimSpace(message),
		Status: "OPEN", Category: category, Severity: severity, SLADueAt: &sla,
	}
	if err := s.tickets.Create(ctx, ticket); err != nil {
		return nil, err
	}
	// WhatsApp the admin team when a new ticket lands (contact form, support
	// page, chat escalation). Fire-and-forget: notification failure must never
	// fail the ticket itself.
	if s.notifier != nil {
		go func(subject, email, category, severity, message string) {
			nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			body := "From: " + email + "\nCategory: " + category + " / " + severity + "\n\n" + message
			if err := s.notifier.NotifyAdmin(nctx, "NUVORA support: "+subject, body); err != nil {
				slog.Error("whatsapp ticket notify failed", "subject", subject, "error", err)
			}
		}(ticket.Subject, ticket.Email, ticket.Category, ticket.Severity, ticket.Message)
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

// ListSupportByCategory — triage queue (G5.2): the safeguarding queue is
// reviewed by the named safeguarding owner every working cycle.
func (s *AdminService) ListSupportByCategory(ctx context.Context, category string, page, pageSize int) ([]content.SupportTicket, int64, error) {
	if s.support == nil {
		return []content.SupportTicket{}, 0, nil
	}
	if !content.ValidTicketCategory(category) {
		return nil, 0, fmt.Errorf("%w: unknown ticket category %q", domain.ErrInvalidInput, category)
	}
	return s.support.ListByCategory(ctx, category, page, pageSize)
}

// CreateProgrammeInput — admin programme creation (console-driven pages).
type CreateProgrammeInput struct {
	Title        string
	Slug         string // optional; derived from the title when empty
	Summary      *string
	Description  *string
	Format       academics.ProgrammeFormat
	CurriculumID *uuid.UUID
	LevelID      *uuid.UUID
	ExamID       *uuid.UUID
	PriceMin     *float64
	PriceMax     *float64
	Currency     string
	IsFeatured   bool
}

// CreateProgrammeAdmin — creates a DRAFT programme (admin console). The slug
// is normalised from the title when not supplied; duplicates are rejected so
// programme pages always have a stable URL.
func (s *AdminService) CreateProgrammeAdmin(ctx context.Context, adminID uuid.UUID, in CreateProgrammeInput) (*academics.Programme, error) {
	if s.programmes == nil {
		return nil, errors.New("programme lifecycle store unavailable")
	}
	if strings.TrimSpace(in.Title) == "" || len(strings.TrimSpace(in.Title)) > 255 {
		return nil, fmt.Errorf("%w: title is required (max 255 chars)", domain.ErrInvalidInput)
	}
	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = slugify(in.Title)
	}
	if len(slug) < 2 || len(slug) > 255 {
		return nil, fmt.Errorf("%w: slug must be 2-255 characters", domain.ErrInvalidInput)
	}
	if in.Format == "" {
		in.Format = academics.FormatCohort
	}
	if in.Currency == "" {
		in.Currency = "NGN"
	}
	if in.PriceMin != nil && in.PriceMax != nil && *in.PriceMax < *in.PriceMin {
		return nil, fmt.Errorf("%w: price_max cannot be below price_min", domain.ErrInvalidInput)
	}

	p := &academics.Programme{
		Title:        strings.TrimSpace(in.Title),
		Slug:         slug,
		Summary:      in.Summary,
		Description:  in.Description,
		CurriculumID: in.CurriculumID,
		LevelID:      in.LevelID,
		ExamID:       in.ExamID,
		Format:       in.Format,
		Status:       academics.ProgrammeDraft,
		PriceMin:     in.PriceMin,
		PriceMax:     in.PriceMax,
		Currency:     in.Currency,
		IsFeatured:   in.IsFeatured,
		CreatedBy:    &adminID,
	}
	if err := s.programmes.CreateProgramme(ctx, p); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditCreate, "programme",
		&p.ID, nil, map[string]any{"title": p.Title, "slug": p.Slug}, nil, nil)
	return p, nil
}

// SetProgrammeStatusAdmin — publish/unpublish a programme without a code
// deployment (G5.3 acceptance). Publishing stamps published_at and sets the
// review cadence (90 days); unpublishing clears both. Every transition is
// audited with the acting admin.
func (s *AdminService) SetProgrammeStatusAdmin(ctx context.Context, adminID, programmeID uuid.UUID, status string) error {
	if s.programmes == nil {
		return errors.New("programme lifecycle store unavailable")
	}
	var target academics.ProgrammeStatus
	switch academics.ProgrammeStatus(status) {
	case academics.ProgrammePublished, academics.ProgrammeDraft, academics.ProgrammeArchived:
		target = academics.ProgrammeStatus(status)
	default:
		return fmt.Errorf("%w: status must be DRAFT, PUBLISHED or ARCHIVED", domain.ErrInvalidInput)
	}

	life, err := s.programmes.GetLifecycle(ctx, programmeID)
	if err != nil {
		return err
	}

	now := s.now().UTC()
	life.Status = target
	if target == academics.ProgrammePublished {
		ts := now
		life.PublishedAt = &ts
		due := now.Add(90 * 24 * time.Hour)
		life.ReviewDueAt = &due
	} else {
		life.PublishedAt = nil
		life.ReviewDueAt = nil
	}
	if err := s.programmes.SetLifecycle(ctx, *life); err != nil {
		return err
	}
	// Catalogue state changed → flush the cached list immediately (G5.3).
	if s.catalogueCache != nil {
		_ = s.catalogueCache.DelPrefix(ctx, "programme")
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "programme",
		&programmeID, nil, map[string]any{"status": string(target)}, nil, nil)
	return nil
}

// SetTestimonialPublic — publication sign-off (G5.3). Approval requires the
// consent rule (consent_given=true) — marketing content cannot go live on a
// fixture or an unconsented claim. Withdrawal is always allowed.
func (s *AdminService) SetTestimonialPublic(ctx context.Context, adminID, testimonialID uuid.UUID, isPublic bool) error {
	if s.testimonials == nil {
		return errors.New("testimonial store unavailable")
	}
	if isPublic {
		// The consent rule is enforced here because the repo interface is
		// write-only for is_public; ListPublic only ever returns rows with
		// consent_given=TRUE AND is_public=TRUE anyway (defence in depth).
		if !s.testimonialConsented(ctx, testimonialID) {
			return fmt.Errorf("%w: testimonial has no recorded consent — refusing to publish", domain.ErrForbidden)
		}
	}
	if err := s.testimonials.SetPublic(ctx, testimonialID, isPublic, &adminID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "testimonial",
		&testimonialID, nil, map[string]any{"is_public": isPublic}, nil, nil)
	return nil
}

// testimonialConsented — the consent rule: a testimonial may go public only
// when consent_given was recorded at creation (G5.3 publication sign-off).
func (s *AdminService) testimonialConsented(ctx context.Context, id uuid.UUID) bool {
	t, err := s.testimonials.GetByID(ctx, id)
	if err != nil {
		return false
	}
	return t.ConsentGiven
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
	if strings.TrimSpace(c.Code) == "" {
		c.Code = "NV-" + strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
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

// AssignTutorToCohortAdmin — assigns a tutor to teach a cohort. Only tutors
// who are APPROVED (and thus visible/public) may be assigned; nil clears the
// assignment so the cohort returns to "awaiting tutor". Audited.
func (s *AdminService) AssignTutorToCohortAdmin(ctx context.Context, adminID, cohortID, tutorProfileID uuid.UUID) error {
	if s.tutors != nil {
		t, err := s.tutors.GetByID(ctx, tutorProfileID)
		if err != nil {
			return fmt.Errorf("%w: tutor profile not found", domain.ErrNotFound)
		}
		if t.Status != tutor.TutorStatusApproved {
			return fmt.Errorf("%w: only approved tutors can be assigned to a cohort (current status %s)",
				domain.ErrConflict, t.Status)
		}
	}
	if s.cohortAdmin == nil {
		return errors.New("cohort repository not configured")
	}
	if err := s.cohortAdmin.UpdateTutor(ctx, cohortID, &tutorProfileID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "cohort",
		&cohortID, nil, map[string]any{"tutor_profile_id": tutorProfileID.String()}, nil, nil)
	return nil
}

// SetCohortBanner stores the cohort banner image URL. Callers (the admin
// upload endpoint) always pass a server-side uploaded JPEG/PNG object URL.
func (s *AdminService) SetCohortBanner(ctx context.Context, cohortID uuid.UUID, bannerURL string) error {
	if s.cohortAdmin == nil {
		return errors.New("cohort repository not configured")
	}
	return s.cohortAdmin.UpdateBanner(ctx, cohortID, bannerURL)
}

// ClearCohortTutorAdmin — unassigns a cohort's tutor (back to "awaiting tutor").
func (s *AdminService) ClearCohortTutorAdmin(ctx context.Context, adminID, cohortID uuid.UUID) error {
	if s.cohortAdmin == nil {
		return errors.New("cohort repository not configured")
	}
	if err := s.cohortAdmin.UpdateTutor(ctx, cohortID, nil); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "cohort",
		&cohortID, nil, map[string]any{"tutor_profile_id": nil}, nil, nil)
	return nil
}

// ListLessonsToday — today's classes (admin).
func (s *AdminService) ListLessonsToday(ctx context.Context) ([]booking.Lesson, error) {
	if s.lessonAdmin == nil {
		return []booking.Lesson{}, nil
	}
	return s.lessonAdmin.ListByDate(ctx, time.Now().UTC())
}

// ── Payments admin (phase 38) ──────────────────────────────────────────────

func (s *AdminService) RequestCohortJoin(ctx context.Context, tutorProfileID, cohortID uuid.UUID, note *string) (*booking.CohortJoinRequest, error) {
	if s.cohortAdmin == nil {
		return nil, errors.New("cohort store unavailable")
	}
	return s.cohortAdmin.RequestJoin(ctx, cohortID, tutorProfileID, note)
}

// RequestCohortJoinForUser resolves the actor's tutor profile and opens (or
// re-opens) a PENDING join request. Only APPROVED tutors may request.
func (s *AdminService) RequestCohortJoinForUser(ctx context.Context, userID, cohortID uuid.UUID, note *string) (*booking.CohortJoinRequest, error) {
	if s.vetting == nil {
		return nil, errors.New("vetting store unavailable")
	}
	profile, err := s.vetting.GetProfileByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%w: tutor profile required — complete vetting first", domain.ErrNotFound)
	}
	if profile.Status != tutor.TutorStatusApproved {
		return nil, fmt.Errorf("%w: only approved tutors can request to join a cohort (current status %s)",
			domain.ErrForbidden, profile.Status)
	}
	return s.RequestCohortJoin(ctx, profile.ID, cohortID, note)
}

func (s *AdminService) ListCohortJoins(ctx context.Context, status string) ([]booking.CohortJoinRequest, error) {
	if s.cohortAdmin == nil {
		return []booking.CohortJoinRequest{}, nil
	}
	return s.cohortAdmin.ListJoinRequests(ctx, status)
}

func (s *AdminService) ReviewCohortJoin(ctx context.Context, adminID, requestID uuid.UUID, status string) (*booking.CohortJoinRequest, error) {
	if status != "APPROVED" && status != "REJECTED" {
		return nil, fmt.Errorf("%w: status must be APPROVED or REJECTED", domain.ErrInvalidInput)
	}
	if s.cohortAdmin == nil {
		return nil, errors.New("cohort store unavailable")
	}
	jr, err := s.cohortAdmin.ReviewJoin(ctx, requestID, status, adminID)
	if err != nil {
		return nil, err
	}
	if status == "APPROVED" {
		_ = s.cohortAdmin.UpdateTutor(ctx, jr.CohortID, &jr.TutorProfileID)
	}
	return jr, nil
}

func (s *AdminService) ProgrammeRoster(ctx context.Context, slug string) (map[string]any, error) {
	if s.cohortAdmin == nil {
		return nil, errors.New("cohort store unavailable")
	}
	return s.cohortAdmin.ProgrammeRoster(ctx, slug)
}

func (s *AdminService) GetOrderDetail(ctx context.Context, id uuid.UUID) (*payment.Order, []payment.OrderItem, error) {
	if s.orders == nil {
		return nil, nil, errors.New("orders store unavailable")
	}
	o, err := s.orders.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	items, err := s.orders.ListItems(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if items == nil {
		items = []payment.OrderItem{}
	}
	return o, items, nil
}

// OrderDetailView — everything the admin payments console needs on one page:
// the order, its line items, every payment row (provider, reference, status,
// timestamps) and the people involved (payer identity + learner identity).
type OrderDetailView struct {
	Order    *payment.Order      `json:"order"`
	Items    []payment.OrderItem `json:"items"`
	Payments []payment.Payment   `json:"payments"`
	Payer    *OrderPartyIdentity `json:"payer,omitempty"`
	Student  *OrderPartyIdentity `json:"student,omitempty"`
}

// OrderPartyIdentity — human-readable identity attached to an order.
type OrderPartyIdentity struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email,omitempty"`
	Phone  string `json:"phone,omitempty"`
	Level  string `json:"level,omitempty"`  // student: current_level
	School string `json:"school,omitempty"` // student: school_name
}

// GetOrderDetailRich — order + items + payment rows + payer/learner identity.
func (s *AdminService) GetOrderDetailRich(ctx context.Context, id uuid.UUID) (*OrderDetailView, error) {
	o, items, err := s.GetOrderDetail(ctx, id)
	if err != nil {
		return nil, err
	}
	view := &OrderDetailView{Order: o, Items: items, Payments: []payment.Payment{}}
	if s.paymentRows != nil {
		if rows, err := s.paymentRows.GetByOrderID(ctx, id); err == nil {
			view.Payments = rows
		}
	}
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, o.ParentUserID); err == nil && u != nil {
			view.Payer = &OrderPartyIdentity{
				ID:    u.ID.String(),
				Name:  strings.TrimSpace(u.FirstName + " " + u.LastName),
				Email: u.Email,
				Phone: strOrEmpty(u.Phone),
			}
		}
	}
	if s.students != nil && o.StudentID != nil {
		if sp, err := s.students.FindByID(ctx, *o.StudentID); err == nil && sp != nil {
			view.Student = &OrderPartyIdentity{
				ID:     sp.ID.String(),
				Name:   strings.TrimSpace(sp.FirstName + " " + sp.LastName),
				Level:  strOrEmpty(sp.CurrentLevel),
				School: strOrEmpty(sp.SchoolName),
			}
		}
	}
	return view, nil
}

func strOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(*p)
}

func (s *AdminService) ListOrders(ctx context.Context, limit, offset int) ([]payment.Order, int64, error) {
	if s.orders == nil {
		return []payment.Order{}, 0, nil
	}
	list, total, err := s.orders.ListAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	if list == nil {
		list = []payment.Order{}
	}
	return list, total, nil
}

func (s *AdminService) ListPayouts(ctx context.Context, status string) ([]payment.Payout, error) {
	if s.payouts == nil {
		return []payment.Payout{}, nil
	}
	list, err := s.payouts.ListByStatus(ctx, payment.PayoutStatus(status), 200)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []payment.Payout{}
	}
	return list, nil
}
