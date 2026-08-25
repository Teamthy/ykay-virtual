package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/leads"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/ops"
	payment_provider "ykay-virtual/internal/payment"

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
	transfers      payment_provider.TransferProvider
	subjects       academics.SubjectRepository
	tutorSubjects  tutor.TutorSubjectRepository
	lmsStarter     func(ctx context.Context, cohortID, tutorProfileID uuid.UUID, cohortTitle string) error
	leadsRepo      leads.Repository
	enrollments    booking.CohortEnrollmentRepository
	tutorByUser    func(ctx context.Context, userID uuid.UUID) (*tutor.TutorProfile, error)
	users          identity.UserRepository
	roles          identity.RoleRepository
	auditLogs      identity.AuditLogRepository
	tutors         tutor.TutorRepository
	vetting        vetting.VettingRepository
	audit          identity.AuditService
	now            func() time.Time
}

// WithEnrollments wires the pending-enrolment admin view.
func (s *AdminService) WithEnrollments(e booking.CohortEnrollmentRepository) *AdminService {
	s.enrollments = e
	return s
}

// WithTutorLookup wires tutor-profile-by-user for the user detail view.
func (s *AdminService) WithTutorLookup(f func(ctx context.Context, userID uuid.UUID) (*tutor.TutorProfile, error)) *AdminService {
	s.tutorByUser = f
	return s
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
// UpdateProgrammeAdmin — edit an existing programme (title/summary/description/
// pricing/featured). Slug + status flow through their own actions.
func (s *AdminService) UpdateProgrammeAdmin(ctx context.Context, adminID, programmeID uuid.UUID,
	title, summary string, description *string, priceMin, priceMax float64, currency string, featured bool) (*academics.Programme, error) {
	if s.programmes == nil {
		return nil, errors.New("programme lifecycle store unavailable")
	}
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrInvalidInput)
	}
	life, err := s.programmes.GetLifecycle(ctx, programmeID)
	if err != nil {
		return nil, err
	}
	var summaryPtr *string
	if strings.TrimSpace(summary) != "" {
		summaryPtr = &summary
	}
	var priceMinPtr, priceMaxPtr *float64
	if priceMin > 0 {
		priceMinPtr = &priceMin
	}
	if priceMax > 0 {
		priceMaxPtr = &priceMax
	}
	p := &academics.Programme{ID: life.ID, Title: strings.TrimSpace(title),
		Summary: summaryPtr, Description: description, PriceMin: priceMinPtr, PriceMax: priceMaxPtr,
		Currency: currency, IsFeatured: featured, Status: life.Status}
	if err := s.programmes.UpdateProgramme(ctx, p); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "programme", &programmeID,
		nil, map[string]any{"action": "programme_updated", "title": p.Title}, nil, nil)
	return p, nil
}

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
	s.ensureLMSStarterPack(ctx, cohortID, tutorProfileID)
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "cohort",
		&cohortID, nil, map[string]any{"tutor_profile_id": tutorProfileID.String()}, nil, nil)
	return nil
}

// ensureLMSStarterPack — every tutor attached to a cohort gets a fully
// functional LMS out of the box (idempotent; fire-and-forget so a starter
// failure never blocks the assignment itself).
func (s *AdminService) ensureLMSStarterPack(ctx context.Context, cohortID, tutorProfileID uuid.UUID) {
	if s.lmsStarter == nil {
		return
	}
	title := ""
	if c, _, err := s.cohortAdmin.ListAll(ctx, booking.CohortListParams{PageSize: 200}); err == nil {
		for _, row := range c {
			if row.ID == cohortID {
				title = row.Title
				break
			}
		}
	}
	go func() {
		nctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.lmsStarter(nctx, cohortID, tutorProfileID, title); err != nil {
			slog.Error("lms starter pack failed", "cohort_id", cohortID, "tutor_profile_id", tutorProfileID, "error", err)
		}
	}()
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

// CohortJoinView — a join request enriched with the details admins actually
// review: who the tutor is (name, email, verification state) and which
// cohort (title). Raw UUIDs never reach the console again.
type CohortJoinView struct {
	booking.CohortJoinRequest
	TutorName    string `json:"tutor_name"`
	TutorEmail   string `json:"tutor_email,omitempty"`
	TutorSlug    string `json:"tutor_slug,omitempty"`
	TutorStatus  string `json:"tutor_status,omitempty"`
	TutorYears   int    `json:"tutor_years_experience,omitempty"`
	CohortTitle  string `json:"cohort_title"`
}

func (s *AdminService) ListCohortJoins(ctx context.Context, status string) ([]CohortJoinView, error) {
	if s.cohortAdmin == nil {
		return []CohortJoinView{}, nil
	}
	rows, err := s.cohortAdmin.ListJoinRequests(ctx, status)
	if err != nil {
		return nil, err
	}
	out := make([]CohortJoinView, 0, len(rows))
	for i := range rows {
		v := CohortJoinView{CohortJoinRequest: rows[i], TutorName: "Unknown tutor", CohortTitle: "Unknown cohort"}
		if s.tutors != nil {
			if tp, err := s.tutors.GetByID(ctx, rows[i].TutorProfileID); err == nil && tp != nil {
				v.TutorName = tp.DisplayName
				v.TutorSlug = tp.Slug
				v.TutorStatus = string(tp.Status)
				v.TutorYears = tp.YearsExperience
				if s.users != nil {
					if u, err := s.users.FindByID(ctx, tp.UserID); err == nil && u != nil {
						v.TutorEmail = u.Email
					}
				}
			}
		}
		if s.cohortAdmin != nil {
			if c, err := s.cohortAdmin.GetCohort(ctx, rows[i].CohortID); err == nil && c != nil {
				v.CohortTitle = c.Title
			}
		}
		out = append(out, v)
	}
	return out, nil
}

// PendingEnrollmentView — student enrolments awaiting payment, with the
// human-readable context. Deliberately SEPARATE from tutor join requests:
// joins are tutors asking to teach; pending enrolments are students who
// started checkout and have not paid (the seat-expiry cron sweeps these).
type PendingEnrollmentView struct {
	booking.CohortEnrollment
	StudentName string `json:"student_name"`
	CohortTitle string `json:"cohort_title"`
	CohortFee   float64 `json:"cohort_fee"`
}

func (s *AdminService) ListPendingEnrollments(ctx context.Context, limit int) ([]PendingEnrollmentView, error) {
	if s.enrollments == nil || s.cohortAdmin == nil {
		return []PendingEnrollmentView{}, nil
	}
	if limit < 1 || limit > 500 {
		limit = 100
	}
	rows, err := s.enrollments.ListPending(ctx, limit)
	if err != nil {
		return nil, err
	}
	out := make([]PendingEnrollmentView, 0, len(rows))
	for i := range rows {
		v := PendingEnrollmentView{CohortEnrollment: rows[i], StudentName: "Unknown student", CohortTitle: "Unknown cohort"}
		if s.students != nil {
			if st, err := s.students.FindByID(ctx, rows[i].StudentProfileID); err == nil && st != nil {
				v.StudentName = st.FirstName + " " + st.LastName
			}
		}
		if c, err := s.cohortAdmin.GetCohort(ctx, rows[i].CohortID); err == nil && c != nil {
			v.CohortTitle = c.Title
			v.CohortFee = c.Fee
		}
		out = append(out, v)
	}
	return out, nil
}

// UpdateCohortInput — admin cohort edit. Slug/programme/tutor/status are
// managed by their own dedicated actions, not this form.
type UpdateCohortInput struct {
	Title        string     `json:"title"`
	Capacity     int        `json:"capacity"`
	StartDate    time.Time  `json:"start_date"`
	EndDate      time.Time  `json:"end_date"`
	ScheduleDesc *string    `json:"schedule_description"`
	Timezone     string     `json:"timezone"`
	LocationMode string     `json:"location_mode"`
	Fee          float64    `json:"fee"`
	Currency     string     `json:"currency"`
	EnrollmentOpensAt  *time.Time `json:"enrollment_opens_at"`
	EnrollmentClosesAt *time.Time `json:"enrollment_closes_at"`
}

// UpdateCohortAdmin — edit an existing cohort. Capacity can never drop below
// the count of already-enrolled students; end must follow start; fee ≥ 0.
func (s *AdminService) UpdateCohortAdmin(ctx context.Context, adminID, cohortID uuid.UUID, in UpdateCohortInput) (*booking.Cohort, error) {
	if s.cohortAdmin == nil {
		return nil, errors.New("cohort store unavailable")
	}
	c, err := s.cohortAdmin.GetCohort(ctx, cohortID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Title) == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrInvalidInput)
	}
	if in.Capacity < 1 {
		return nil, fmt.Errorf("%w: capacity must be at least 1", domain.ErrInvalidInput)
	}
	if in.Capacity < c.EnrolledCount {
		return nil, fmt.Errorf("%w: capacity (%d) is below the enrolled count (%d)", domain.ErrInvalidInput, in.Capacity, c.EnrolledCount)
	}
	if !in.EndDate.After(in.StartDate) {
		return nil, fmt.Errorf("%w: end date must be after start date", domain.ErrInvalidInput)
	}
	if in.Fee < 0 {
		return nil, fmt.Errorf("%w: fee cannot be negative", domain.ErrInvalidInput)
	}
	c.Title = strings.TrimSpace(in.Title)
	c.Capacity = in.Capacity
	c.StartDate = in.StartDate
	c.EndDate = in.EndDate
	c.ScheduleDesc = in.ScheduleDesc
	c.Timezone = in.Timezone
	c.LocationMode = in.LocationMode
	c.Fee = in.Fee
	c.Currency = in.Currency
	c.EnrollmentOpensAt = in.EnrollmentOpensAt
	c.EnrollmentClosesAt = in.EnrollmentClosesAt
	if err := s.cohortAdmin.Update(ctx, c); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "cohort", &cohortID,
		nil, map[string]any{"action": "cohort_updated", "title": c.Title, "capacity": c.Capacity, "fee": c.Fee}, nil, nil)
	return c, nil
}

// UserDetailView — full profile for the user console: account + roles +
// tutor profile summary when the account is a tutor. Read for any admin;
// edits remain SUPER_ADMIN-only (enforced at the route).
type UserDetailView struct {
	identity.User
	Roles       []string           `json:"roles"`
	TutorSlug   string             `json:"tutor_slug,omitempty"`
	TutorStatus string             `json:"tutor_status,omitempty"`
}

func (s *AdminService) GetUserDetail(ctx context.Context, userID uuid.UUID) (*UserDetailView, error) {
	if s.users == nil {
		return nil, errors.New("user store unavailable")
	}
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	view := &UserDetailView{User: *u, Roles: []string{}}
	if s.roles != nil {
		if list, err := s.roles.RolesForUser(ctx, userID); err == nil {
			for _, r := range list {
				view.Roles = append(view.Roles, r.Name)
			}
		}
	}
	if s.tutorByUser != nil {
		if tp, err := s.tutorByUser(ctx, userID); err == nil && tp != nil {
			view.TutorSlug = tp.Slug
			view.TutorStatus = string(tp.Status)
		}
	}
	return view, nil
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
		s.ensureLMSStarterPack(ctx, jr.CohortID, jr.TutorProfileID)
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

// UserEmail resolves a user's email address (admin diagnostics: test email).
func (s *AdminService) UserEmail(ctx context.Context, userID uuid.UUID) (string, error) {
	if s.users == nil {
		return "", errors.New("user store unavailable")
	}
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return "", err
	}
	return u.Email, nil
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

// ── Payout queue (bank transfers) ─────────────────────────────────────────

// AdminPayoutRow — one payout joined with the tutor's identity + bank
// details so the admin can execute the transfer and confirm it.
type AdminPayoutRow struct {
	Payout             payment.Payout `json:"payout"`
	TutorProfileID     uuid.UUID      `json:"tutor_profile_id"`
	TutorDisplayName   string         `json:"tutor_display_name"`
	TutorEmail         string         `json:"tutor_email,omitempty"`
	TutorPhone         string         `json:"tutor_phone,omitempty"`
	BankName           string         `json:"bank_name,omitempty"`
	AccountNumber      string         `json:"account_number,omitempty"`
	AccountName        string         `json:"account_name,omitempty"`
	BankDetailsMissing bool           `json:"bank_details_missing"`
}

// PayoutQueue — payouts joined with tutor identity + bank details. status ""
// returns all, newest first.
func (s *AdminService) PayoutQueue(ctx context.Context, status string) ([]AdminPayoutRow, error) {
	if s.payouts == nil {
		return []AdminPayoutRow{}, nil
	}
	list, err := s.payouts.ListByStatus(ctx, payment.PayoutStatus(status), 200)
	if err != nil {
		return nil, err
	}
	out := make([]AdminPayoutRow, 0, len(list))
	for _, p := range list {
		row := AdminPayoutRow{Payout: p, TutorProfileID: p.TutorProfileID}
		if s.tutors != nil {
			if tp, terr := s.tutors.GetByID(ctx, p.TutorProfileID); terr == nil && tp != nil {
				row.TutorDisplayName = tp.DisplayName
				if tp.BankName != nil {
					row.BankName = *tp.BankName
				}
				if tp.AccountNumber != nil {
					row.AccountNumber = *tp.AccountNumber
				}
				if tp.AccountName != nil {
					row.AccountName = *tp.AccountName
				}
				row.BankDetailsMissing = row.BankName == "" || row.AccountNumber == "" || row.AccountName == ""
				if s.users != nil {
					if u, uerr := s.users.FindByID(ctx, tp.UserID); uerr == nil && u != nil {
						row.TutorEmail = u.Email
						row.TutorPhone = strOrEmpty(u.Phone)
					}
				}
			}
		}
		out = append(out, row)
	}
	return out, nil
}

// PayoutTutorContact — resolves who a payout belongs to, for notification.
func (s *AdminService) PayoutTutorContact(ctx context.Context, payoutID uuid.UUID) (displayName, phone, email string, err error) {
	if s.payouts == nil {
		return "", "", "", errors.New("payout store unavailable")
	}
	list, err := s.payouts.ListByStatus(ctx, "", 500)
	if err != nil {
		return "", "", "", err
	}
	for _, p := range list {
		if p.ID != payoutID {
			continue
		}
		if s.tutors == nil {
			return "", "", "", nil
		}
		tp, terr := s.tutors.GetByID(ctx, p.TutorProfileID)
		if terr != nil || tp == nil {
			return "", "", "", nil
		}
		displayName = tp.DisplayName
		if s.users != nil {
			if u, uerr := s.users.FindByID(ctx, tp.UserID); uerr == nil && u != nil {
				email = u.Email
				phone = strOrEmpty(u.Phone)
			}
		}
		return displayName, phone, email, nil
	}
	return "", "", "", fmt.Errorf("%w: payout not found", domain.ErrNotFound)
}

// ── Paystack one-click payouts ────────────────────────────────────────────

// WithTransferProvider wires the Paystack transfer seam (nil = feature off).
// Transfers move real money — the provider itself fails closed when its
// secret is a placeholder.
func (s *AdminService) WithTransferProvider(p payment_provider.TransferProvider) *AdminService {
	s.transfers = p
	return s
}

// TransfersEnabled reports whether one-click payouts are available.
func (s *AdminService) TransfersEnabled() bool { return s.transfers != nil }

// PayoutViaPaystack — initiates (or continues) a Paystack bank transfer for a
// PENDING payout. Caches the transfer recipient on the tutor profile, marks
// the payout PAID when Paystack settles immediately, or records the transfer
// code + OTP flag when the bank requires a finalize OTP. Idempotent at
// Paystack via the payout id as transfer reference.
func (s *AdminService) PayoutViaPaystack(ctx context.Context, adminID, payoutID uuid.UUID) (needsOTP bool, err error) {
	if s.transfers == nil {
		return false, fmt.Errorf("%w: Paystack transfers are not enabled", domain.ErrConflict)
	}
	if s.payouts == nil {
		return false, errors.New("payout store unavailable")
	}
	p, err := s.payouts.GetByID(ctx, payoutID)
	if err != nil {
		return false, err
	}
	if p.Status != payment.PayoutPending {
		return false, fmt.Errorf("%w: payout %s is %s (only PENDING payouts can be transferred)", domain.ErrConflict, p.ID, p.Status)
	}
	if p.OTPRequired && p.TransferCode != nil {
		return true, nil // already initiated; waiting on the finalize OTP
	}
	if s.tutors == nil {
		return false, errors.New("tutor store unavailable")
	}
	tp, err := s.tutors.GetByID(ctx, p.TutorProfileID)
	if err != nil || tp == nil {
		return false, fmt.Errorf("%w: tutor profile not found", domain.ErrNotFound)
	}
	if tp.AccountNumber == nil || tp.AccountName == nil || tp.BankCode == nil || tp.BankName == nil {
		return false, fmt.Errorf("%w: tutor has no complete bank details (bank name, bank code, account number and account name are required for Paystack transfers)", domain.ErrConflict)
	}

	recipientCode := ""
	if tp.PaystackRecipientCode != nil {
		recipientCode = *tp.PaystackRecipientCode
	}
	email := ""
	if s.users != nil {
		if u, uerr := s.users.FindByID(ctx, tp.UserID); uerr == nil && u != nil {
			email = u.Email
		}
	}
	if recipientCode == "" {
		code, cerr := s.transfers.CreateTransferRecipient(ctx, payment_provider.TransferRecipientInput{
			AccountNumber: *tp.AccountNumber,
			BankCode:      *tp.BankCode,
			AccountName:   *tp.AccountName,
			Email:         email,
		})
		if cerr != nil {
			return false, cerr
		}
		recipientCode = code
		if s.vetting != nil {
			_ = s.vetting.SetPaystackRecipientCode(ctx, tp.ID, code)
		}
	}

	reason := "NUVORA tutor payout " + p.ID.String()
	res, err := s.transfers.InitiateTransfer(ctx, p.Amount, p.Currency, recipientCode, p.ID.String(), reason)
	if err != nil {
		return false, err
	}
	switch res.Status {
	case payment_provider.TransferSuccess:
		now := time.Now().UTC()
		if err := s.payouts.UpdateStatus(ctx, p.ID, payment.PayoutPaid, &res.TransferCode, &now); err != nil {
			return false, err
		}
		_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditPayout, "payout",
			&p.ID, map[string]any{"status": payment.PayoutPending}, map[string]any{
				"status": payment.PayoutPaid, "amount": p.Amount, "currency": p.Currency,
				"provider": "PAYSTACK", "transfer_code": res.TransferCode,
			}, nil, nil)
		return false, nil
	case payment_provider.TransferOTP:
		if err := s.payouts.SetTransferMeta(ctx, p.ID, &res.TransferCode, true); err != nil {
			return false, err
		}
		_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditPayout, "payout",
			&p.ID, nil, map[string]any{"transfer_initiated": res.TransferCode, "otp_required": true}, nil, nil)
		return true, nil
	case payment_provider.TransferPending:
		if err := s.payouts.SetTransferMeta(ctx, p.ID, &res.TransferCode, false); err != nil {
			return false, err
		}
		return false, nil
	default:
		return false, fmt.Errorf("paystack transfer %s: %s", p.ID, res.Message)
	}
}

// CompletePaystackTransfer — finalizes an OTP-gated transfer with the OTP the
// admin received from the bank, then marks the payout PAID.
func (s *AdminService) CompletePaystackTransfer(ctx context.Context, adminID, payoutID uuid.UUID, otp string) (*payment.Payout, error) {
	otp = strings.TrimSpace(otp)
	if otp == "" {
		return nil, fmt.Errorf("%w: OTP is required", domain.ErrInvalidInput)
	}
	if s.transfers == nil {
		return nil, fmt.Errorf("%w: Paystack transfers are not enabled", domain.ErrConflict)
	}
	p, err := s.payouts.GetByID(ctx, payoutID)
	if err != nil {
		return nil, err
	}
	if p.Status != payment.PayoutPending || !p.OTPRequired || p.TransferCode == nil {
		return nil, fmt.Errorf("%w: payout is not waiting on a transfer OTP", domain.ErrConflict)
	}
	res, err := s.transfers.FinalizeTransfer(ctx, *p.TransferCode, otp)
	if err != nil {
		return nil, err
	}
	if res.Status != payment_provider.TransferSuccess {
		return nil, fmt.Errorf("paystack finalize: %s", res.Message)
	}
	now := time.Now().UTC()
	if err := s.payouts.UpdateStatus(ctx, p.ID, payment.PayoutPaid, &res.TransferCode, &now); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditPayout, "payout",
		&p.ID, map[string]any{"status": payment.PayoutPending}, map[string]any{
			"status": payment.PayoutPaid, "provider": "PAYSTACK",
			"transfer_code": res.TransferCode, "otp_finalized": true,
		}, nil, nil)
	p.Status = payment.PayoutPaid
	p.ProviderReference = &res.TransferCode
	p.ProcessedAt = &now
	return p, nil
}

// ── Admin tutor console ───────────────────────────────────────────────────

// WithLeads wires the lead store so the admin overview can surface the
// conversion funnel (new leads, totals).
func (s *AdminService) WithLeads(l leads.Repository) *AdminService {
	s.leadsRepo = l
	return s
}

// WithLMSStarter wires the automatic LMS starter pack: every cohort a tutor
// is attached to gets a recorded demo lesson, study resource, assignment and
// homework note (idempotent).
func (s *AdminService) WithLMSStarter(fn func(ctx context.Context, cohortID, tutorProfileID uuid.UUID, cohortTitle string) error) *AdminService {
	s.lmsStarter = fn
	return s
}

// WithTutorConsole wires the subject catalogue + teaching-scope repo so the
// admin console can create and edit tutor profiles end to end.
func (s *AdminService) WithTutorConsole(subjects academics.SubjectRepository, tutorSubjects tutor.TutorSubjectRepository) *AdminService {
	s.subjects = subjects
	s.tutorSubjects = tutorSubjects
	return s
}

// AdminUpsertTutorInput — create (or edit) a tutor from the admin console.
type AdminUpsertTutorInput struct {
	Email           string   `json:"email"`
	Password        string   `json:"password"` // required when creating the account
	DisplayName     string   `json:"display_name"`
	Headline        *string  `json:"headline,omitempty"`
	Bio             *string  `json:"bio,omitempty"`
	YearsExperience int      `json:"years_experience"`
	HourlyRateMin   *float64 `json:"hourly_rate_min,omitempty"`
	HourlyRateMax   *float64 `json:"hourly_rate_max,omitempty"`
	Approve         bool     `json:"approve"` // APPROVED + public immediately (vetted tutor)
	SubjectSlugs    []string `json:"subject_slugs,omitempty"`
}

// UpsertTutorAdmin — creates the tutor account (when the email is new) and
// the vetting profile, applies the editable fields, optionally approves +
// publishes, and attaches the teaching subjects. Idempotent per email.
func (s *AdminService) UpsertTutorAdmin(ctx context.Context, adminID uuid.UUID, in AdminUpsertTutorInput) (*tutor.TutorProfile, error) {
	if s.users == nil || s.roles == nil || s.vetting == nil {
		return nil, errors.New("admin tutor console not configured (users/roles/vetting stores)")
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := mail.ParseAddress(in.Email); err != nil {
		return nil, fmt.Errorf("%w: a valid email is required", domain.ErrInvalidInput)
	}
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	if in.DisplayName == "" || len(in.DisplayName) > 255 {
		return nil, fmt.Errorf("%w: display name is required (max 255 chars)", domain.ErrInvalidInput)
	}
	if in.YearsExperience < 0 || in.YearsExperience > 80 {
		return nil, fmt.Errorf("%w: years experience must be 0-80", domain.ErrInvalidInput)
	}
	if in.HourlyRateMin != nil && in.HourlyRateMax != nil && *in.HourlyRateMax < *in.HourlyRateMin {
		return nil, fmt.Errorf("%w: hourly_rate_max cannot be below hourly_rate_min", domain.ErrInvalidInput)
	}

	// Account: create (with password) or reuse.
	user, err := s.users.FindByEmail(ctx, in.Email)
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		if strings.TrimSpace(in.Password) == "" {
			return nil, fmt.Errorf("%w: password is required to create a new tutor account", domain.ErrInvalidInput)
		}
		if perr := ops.ValidatePassword(in.Password); perr != nil {
			return nil, fmt.Errorf("%w: %v", domain.ErrInvalidInput, perr)
		}
		hash, herr := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
		if herr != nil {
			return nil, herr
		}
		now := s.now().UTC()
		user = &identity.User{
			Email: in.Email, PasswordHash: string(hash),
			Status: identity.UserStatusActive, Timezone: "Africa/Lagos",
			EmailVerifiedAt: &now, OnboardedAt: &now,
		}
		if err := s.users.Create(ctx, user); err != nil {
			return nil, err
		}
		// TUTOR role grant.
		if role, rerr := s.roles.FindByName(ctx, "TUTOR"); rerr == nil {
			_ = s.roles.AssignToUser(ctx, user.ID, role.ID)
		}
	} else if strings.TrimSpace(in.Password) != "" {
		// Password reset for an existing tutor account.
		if perr := ops.ValidatePassword(in.Password); perr != nil {
			return nil, fmt.Errorf("%w: %v", domain.ErrInvalidInput, perr)
		}
		hash, herr := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
		if herr != nil {
			return nil, herr
		}
		user.PasswordHash = string(hash)
		if err := s.users.Update(ctx, user); err != nil {
			return nil, err
		}
	}

	// Profile: create or load.
	profile, err := s.vetting.GetProfileByUserID(ctx, user.ID)
	created := false
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		profile = &tutor.TutorProfile{
			UserID:      user.ID,
			Slug:        fmt.Sprintf("%s-%s", slugify(in.DisplayName), uuid.NewString()[:4]),
			DisplayName: in.DisplayName, YearsExperience: in.YearsExperience,
			Currency: "NGN", Timezone: "Africa/Lagos",
			AcceptsOnline: true, AcceptsInPerson: true,
		}
		if err := s.vetting.CreateProfile(ctx, profile); err != nil {
			return nil, err
		}
		created = true
	}

	// Editable fields.
	if err := s.vetting.UpdateProfileAdmin(ctx, profile.ID, in.DisplayName, in.Headline, in.Bio, in.YearsExperience, in.HourlyRateMin, in.HourlyRateMax); err != nil {
		return nil, err
	}

	// Approval + publication (vetted tutor).
	if in.Approve {
		if err := s.vetting.MarkApproved(ctx, profile.ID, adminID, 0.8); err != nil {
			return nil, err
		}
		if err := s.vetting.SetPublic(ctx, profile.ID, true); err != nil {
			return nil, err
		}
	}

	// Teaching scope.
	if len(in.SubjectSlugs) > 0 && s.subjects != nil && s.tutorSubjects != nil {
		for _, slug := range in.SubjectSlugs {
			sub, serr := s.subjects.GetBySlug(ctx, strings.TrimSpace(slug))
			if serr != nil || sub == nil {
				continue
			}
			_ = s.tutorSubjects.AddForTutor(ctx, profile.ID, sub.ID)
		}
	}

	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "tutor_profile",
		&profile.ID, nil, map[string]any{
			"email": user.Email, "created": created, "approved": in.Approve,
			"subjects": in.SubjectSlugs,
		}, nil, nil)

	out, err := s.vetting.GetProfileByID(ctx, profile.ID)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// ListApprovedTutors — the admin console roster (APPROVED profiles, newest
// first).
func (s *AdminService) ListApprovedTutors(ctx context.Context) ([]tutor.TutorProfile, int64, error) {
	if s.vetting == nil {
		return []tutor.TutorProfile{}, 0, nil
	}
	return s.vetting.ListByStatus(ctx, string(tutor.TutorStatusApproved), 100, 0)
}

// ── Admin overview (single-request operations dashboard) ──────────────────

// AdminOverview — everything the admin dashboard needs in one request: the
// platform stats, the conversion funnel, money in flight and the queues that
// need a human.
type AdminOverview struct {
	Stats admin.Overview2 `json:"stats"`
	// Leads — conversion funnel.
	LeadsNew   int64 `json:"leads_new"`
	LeadsTotal int64 `json:"leads_total"`
	// Money in flight.
	PayoutsPendingTotal float64 `json:"payouts_pending_total"`
	// Queues needing attention.
	VettingSubmitted int64 `json:"vetting_submitted"`
	JoinsPending     int   `json:"joins_pending"`
	TicketsOpen      int64 `json:"tickets_open"`
	// Activity.
	LessonsToday []booking.Lesson    `json:"lessons_today"`
	RecentAudit  []identity.AuditLog `json:"recent_audit"`
}

// OperationsOverview aggregates the operations dashboard (nil-safe on every
// store) — a single request for the admin home page.
func (s *AdminService) OperationsOverview(ctx context.Context) (*AdminOverview, error) {
	out := &AdminOverview{LessonsToday: []booking.Lesson{}, RecentAudit: []identity.AuditLog{}}

	stats, err := s.Overview2(ctx)
	if err == nil && stats != nil {
		out.Stats = *stats
	}

	if s.leadsRepo != nil {
		if n, err := s.leadsRepo.CountByStatus(ctx, leads.StatusNew); err == nil {
			out.LeadsNew = n
		}
		if list, total, err := s.leadsRepo.List(ctx, "", 1, 1); err == nil {
			_ = list
			out.LeadsTotal = total
		}
	}

	if s.payouts != nil {
		if rows, err := s.payouts.ListByStatus(ctx, payment.PayoutPending, 500); err == nil {
			for _, p := range rows {
				out.PayoutsPendingTotal += p.Amount
			}
		}
	}

	if s.vetting != nil {
		if _, total, err := s.vetting.ListByStatus(ctx, string(tutor.TutorStatusSubmitted), 100, 0); err == nil {
			out.VettingSubmitted = total
		}
	}

	if s.cohortAdmin != nil {
		if reqs, err := s.cohortAdmin.ListJoinRequests(ctx, booking.CohortJoinPending); err == nil {
			out.JoinsPending = len(reqs)
		}
	}

	if _, total, err := s.ListSupportTickets(ctx, "OPEN", 1, 100); err == nil {
		out.TicketsOpen = total
	}

	if lessons, err := s.ListLessonsToday(ctx); err == nil {
		out.LessonsToday = lessons
	}

	if s.auditLogs != nil {
		if rows, err := s.auditLogs.ListRecent(ctx, "", "", 12); err == nil {
			out.RecentAudit = rows
		}
	}

	return out, nil
}
