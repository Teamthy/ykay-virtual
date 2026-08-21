package httpapi

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/notification"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AdminHandler — operations console endpoints (admin-gated):
//   - GET  /admin/stats                        overview dashboard
//   - GET  /admin/blog                         list all posts (status filter, search, pagination)
//   - POST /admin/blog                         create post (with subject/exam tags)
//   - GET  /admin/blog/{postId}                post + tags
//   - PUT  /admin/blog/{postId}                update fields + tags
//   - POST /admin/blog/{postId}/status         {status: PUBLISHED|DRAFT|SCHEDULED|ARCHIVED}
//   - GET  /admin/institutions                 B2B accounts list
//   - GET  /admin/referrals                    referral programme list
//   - GET  /admin/reviews                      review moderation queue
//   - POST /admin/reviews/{reviewId}/moderate  {status: PUBLISHED|HIDDEN|FLAGGED}

type AdminHandler struct {
	svc      *service.AdminService
	payments *service.PaymentService
	storage  storage.Storage
	notifier *service.NotifierService
	mail     notification.EmailSender
	uploadGuard
}

func NewAdminHandler(svc *service.AdminService) *AdminHandler { return &AdminHandler{svc: svc} }

// WithPayments wires the payment service (manual payment confirmation).
func (h *AdminHandler) WithPayments(p *service.PaymentService) *AdminHandler {
	h.payments = p
	return h
}

// WithStorage wires the object store used for cohort banner uploads.
func (h *AdminHandler) WithStorage(s storage.Storage) *AdminHandler {
	h.storage = s
	return h
}

// WithNotifier wires WhatsApp notification (payout confirmations to tutors).
func (h *AdminHandler) WithNotifier(n *service.NotifierService) *AdminHandler {
	h.notifier = n
	return h
}

// WithMail wires the email sender (admin delivery test).
func (h *AdminHandler) WithMail(m notification.EmailSender) *AdminHandler {
	h.mail = m
	return h
}

func (h *AdminHandler) requireAdmin(w http.ResponseWriter, r *http.Request) *uuid.UUID {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return nil
	}
	return &actor.UserID
}

// requireSuperAdmin — role/account management is reserved for SUPER_ADMIN
// only (ACADEMIC_ADMIN can manage content/ops but must never grant roles or
// suspend platform accounts — YK-008).
func (h *AdminHandler) requireSuperAdmin(w http.ResponseWriter, r *http.Request) *uuid.UUID {
	actor := requireActor(w, r)
	if actor == nil {
		return nil
	}
	for _, role := range actor.Roles {
		if role == "SUPER_ADMIN" {
			return &actor.UserID
		}
	}
	WriteAppError(w, pkg.Forbidden("SUPER_ADMIN access required"))
	return nil
}

func (h *AdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	overview, err := h.svc.Overview(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, overview, nil)
}

func (h *AdminHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	res, err := h.svc.ListPosts(r.Context(), content.BlogListAllParams{
		Status:   firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]),
		Search:   r.URL.Query().Get("search"),
		Page:     p.Page,
		PageSize: p.PageSize,
		Sort:     p.Sort,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res.Posts, p.Meta(res.Total))
}

type blogDraftRequest struct {
	Title          string   `json:"title"`
	Slug           string   `json:"slug"`
	Excerpt        *string  `json:"excerpt"`
	Content        string   `json:"content"`
	CoverImageKey  *string  `json:"cover_image_key"`
	SeoTitle       *string  `json:"seo_title"`
	SeoDescription *string  `json:"seo_description"`
	Status         string   `json:"status"`
	SubjectIDs     []string `json:"subject_ids"`
	ExamIDs        []string `json:"exam_ids"`
}

func (h *AdminHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	var req blogDraftRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	draft, err := toBlogDraft(req)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	post, err := h.svc.CreatePost(r.Context(), *adminID, *draft)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, post, nil)
}

func (h *AdminHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	postID, err := ParseUUID(r, "postId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req blogDraftRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	draft, err := toBlogDraft(req)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	post, err := h.svc.UpdatePost(r.Context(), *adminID, postID, *draft)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, post, nil)
}

func (h *AdminHandler) SetPostStatus(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	postID, err := ParseUUID(r, "postId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetPostStatus(r.Context(), *adminID, postID, content.ContentStatus(req.Status)); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"status": req.Status}, nil)
}

func (h *AdminHandler) ListInstitutions(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	institutions, total, err := h.svc.ListInstitutions(r.Context(), institution.InstitutionListParams{
		Search: r.URL.Query().Get("search"),
		Type:   firstNonEmpty(r.URL.Query().Get("type"), p.Filters["type"]),
		Page:   p.Page, PageSize: p.PageSize, Sort: p.Sort,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, institutions, p.Meta(total))
}

func (h *AdminHandler) ListReferrals(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	refs, total, err := h.svc.ListReferrals(r.Context(), referral.ReferralListParams{
		Status: firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]),
		Page:   p.Page, PageSize: p.PageSize,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, refs, p.Meta(total))
}

func (h *AdminHandler) ListReviews(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	reviews, total, err := h.svc.ListReviews(r.Context(), review.ReviewListParams{
		Status: firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]),
		Page:   p.Page, PageSize: p.PageSize,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, reviews, p.Meta(total))
}

func (h *AdminHandler) ModerateReview(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	reviewID, err := ParseUUID(r, "reviewId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.ModerateReview(r.Context(), *adminID, reviewID, review.ReviewStatus(req.Status)); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"status": req.Status}, nil)
}

func toBlogDraft(req blogDraftRequest) (*content.BlogDraft, error) {
	draft := &content.BlogDraft{
		Title: req.Title, Slug: req.Slug, Excerpt: req.Excerpt, Content: req.Content,
		CoverImageKey: req.CoverImageKey, SeoTitle: req.SeoTitle, SeoDescription: req.SeoDescription,
		Status: content.ContentStatus(req.Status),
	}
	for _, s := range req.SubjectIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			return nil, pkg.BadRequest("subject_ids must be UUIDs", nil)
		}
		draft.SubjectIDs = append(draft.SubjectIDs, id)
	}
	for _, e := range req.ExamIDs {
		id, err := uuid.Parse(e)
		if err != nil {
			return nil, pkg.BadRequest("exam_ids must be UUIDs", nil)
		}
		draft.ExamIDs = append(draft.ExamIDs, id)
	}
	return draft, nil
}

// --- Portal admin extensions (Phase 11b) ---

// Stats2 — extended KPI dashboard.
func (h *AdminHandler) Stats2(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	overview, err := h.svc.Overview2(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, overview, nil)
}

// ListSupport — support queue with status filter + pagination.
func (h *AdminHandler) ListSupport(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	category := firstNonEmpty(r.URL.Query().Get("category"), p.Filters["category"])
	if category != "" {
		tickets, total, err := h.svc.ListSupportByCategory(r.Context(), category, p.Page, p.PageSize)
		if err != nil {
			WriteAppError(w, err)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, tickets, p.Meta(total))
		return
	}
	tickets, total, err := h.svc.ListSupportTickets(r.Context(),
		firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]), p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, tickets, p.Meta(total))
}

// SetSupportStatus — resolve/close tickets.
func (h *AdminHandler) SetSupportStatus(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	ticketID, err := ParseUUID(r, "ticketId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetSupportStatus(r.Context(), *adminID, ticketID, req.Status); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"status": req.Status}, nil)
}

// SetProgrammeStatus — publish/unpublish a programme (G5.3): the launch
// catalogue is operable without a code deployment, and every transition is
// audited against the acting admin.
func (h *AdminHandler) SetProgrammeStatus(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	programmeID, err := ParseUUID(r, "programmeId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetProgrammeStatusAdmin(r.Context(), *adminID, programmeID, req.Status); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"id": programmeID, "status": req.Status}, nil)
}

// SetTestimonialPublic — approve/withdraw a testimonial (G5.3). Approval
// enforces the consent rule server-side; non-admin callers are rejected by
// requireAdmin.
func (h *AdminHandler) SetTestimonialPublic(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	testimonialID, err := ParseUUID(r, "testimonialId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		IsPublic bool `json:"is_public"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetTestimonialPublic(r.Context(), *adminID, testimonialID, req.IsPublic); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"id": testimonialID, "is_public": req.IsPublic}, nil)
}

// ListCohorts — all cohorts (any status).
func (h *AdminHandler) ListCohorts(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	cohorts, total, err := h.svc.ListCohortsAdmin(r.Context(),
		firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]), p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, cohorts, p.Meta(total))
}

// CreateCohort — admin creates a cohort (DRAFT by default).
func (h *AdminHandler) CreateCohort(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	var req struct {
		ProgrammeID         string  `json:"programme_id"`
		Title               string  `json:"title"`
		Slug                string  `json:"slug"`
		TutorProfileID      string  `json:"tutor_profile_id"`
		Capacity            int     `json:"capacity"`
		StartDate           string  `json:"start_date"`
		EndDate             string  `json:"end_date"`
		ScheduleDescription *string `json:"schedule_description"`
		Timezone            string  `json:"timezone"`
		LocationMode        string  `json:"location_mode"`
		Fee                 float64 `json:"fee"`
		Currency            string  `json:"currency"`
		Status              string  `json:"status"`
		BannerURL           *string `json:"banner_url"`
		Code                string  `json:"code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	programmeID, err := uuid.Parse(req.ProgrammeID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("programme_id must be a valid UUID", nil))
		return
	}
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("start_date must be YYYY-MM-DD", nil))
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("end_date must be YYYY-MM-DD", nil))
		return
	}
	var tutorID *uuid.UUID
	if req.TutorProfileID != "" {
		id, err := uuid.Parse(req.TutorProfileID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
			return
		}
		tutorID = &id
	}
	cohort, err := h.svc.CreateCohortAdmin(r.Context(), *adminID, &booking.Cohort{
		ProgrammeID:    programmeID,
		Title:          req.Title,
		Slug:           req.Slug,
		TutorProfileID: tutorID,
		Capacity:       req.Capacity,
		StartDate:      start,
		EndDate:        end,
		ScheduleDesc:   req.ScheduleDescription,
		Timezone:       req.Timezone,
		LocationMode:   req.LocationMode,
		Fee:            req.Fee,
		Currency:       req.Currency,
		Status:         booking.CohortStatus(req.Status),
		BannerURL:      req.BannerURL,
		Code:           req.Code,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, cohort, nil)
}

// SetCohortStatus — publish/unpublish/cancel a cohort.
func (h *AdminHandler) SetCohortStatus(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetCohortStatusAdmin(r.Context(), *adminID, cohortID, booking.CohortStatus(req.Status)); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"status": req.Status}, nil)
}

// AssignCohortTutor — assign a tutor to teach a cohort, or clear the
// assignment (omit tutor_profile_id / send empty string to unassign).
//
//	POST /api/v1/admin/cohorts/{cohortId}/tutor  { "tutor_profile_id": "..." }
func (h *AdminHandler) AssignCohortTutor(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		TutorProfileID string `json:"tutor_profile_id"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.TutorProfileID == "" {
		if err := h.svc.ClearCohortTutorAdmin(r.Context(), *adminID, cohortID); err != nil {
			WriteAppError(w, err)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, map[string]any{"cohort_id": cohortID, "tutor_profile_id": nil}, nil)
		return
	}
	tutorID, err := uuid.Parse(req.TutorProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
		return
	}
	if err := h.svc.AssignTutorToCohortAdmin(r.Context(), *adminID, cohortID, tutorID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"cohort_id": cohortID, "tutor_profile_id": tutorID}, nil)
}

// LessonsToday — today's classes.
func (h *AdminHandler) LessonsToday(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	lessons, err := h.svc.ListLessonsToday(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
}

// ListUsers — platform admin: paginated user list with roles, search + status
// filter. Read-only view is available to any platform admin (ACADEMIC_ADMIN
// can review accounts); role grant/revoke and status changes remain
// SUPER_ADMIN-only (requireSuperAdmin).
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	isSuper := false
	for _, role := range actor.Roles {
		if role == "SUPER_ADMIN" {
			isSuper = true
			break
		}
	}
	p := ParsePagination(r)
	users, total, err := h.svc.ListUsers(r.Context(),
		r.URL.Query().Get("search"),
		firstNonEmpty(r.URL.Query().Get("status"), p.Filters["status"]),
		p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	// A non-SUPER_ADMIN admin may review regular users but must NEVER see
	// SUPER_ADMIN accounts or the SUPER_ADMIN role grant (least privilege).
	// Filter server-side so the role is not even returned to them.
	if !isSuper {
		visible := make([]identity.UserWithRoles, 0, len(users))
		for _, u := range users {
			isSup := false
			kept := make([]string, 0, len(u.Roles))
			for _, role := range u.Roles {
				if role == "SUPER_ADMIN" {
					isSup = true
					continue
				}
				kept = append(kept, role)
			}
			if isSup {
				continue // hide super admin accounts entirely
			}
			u.Roles = kept
			visible = append(visible, u)
		}
		users = visible
		total = len(visible) // pagination reflects what this admin can see
	}
	pkg.WriteSuccess(w, http.StatusOK, users, p.Meta(int64(total)))
}

// ListAuditLogs — SUPER_ADMIN: recent audit entries (filter by action/target).
func (h *AdminHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	if h.requireSuperAdmin(w, r) == nil {
		return
	}
	action := r.URL.Query().Get("action")
	targetType := r.URL.Query().Get("target_type")
	limit := 100
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	logs, err := h.svc.ListRecentAudit(r.Context(), action, targetType, limit)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, logs, nil)
}

// ListRoles — SUPER_ADMIN: all assignable platform roles (admin UI dropdown).
func (h *AdminHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	if h.requireSuperAdmin(w, r) == nil {
		return
	}
	roles, err := h.svc.ListRoles(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, roles, nil)
}

// SetUserRole — SUPER_ADMIN: grant/revoke a single role on a user.
func (h *AdminHandler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	actorID := h.requireSuperAdmin(w, r)
	if actorID == nil {
		return
	}
	userID, err := ParseUUID(r, "userId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Role  string `json:"role"`
		Grant *bool  `json:"grant"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.Grant == nil {
		WriteAppError(w, pkg.BadRequest("grant (true/false) is required", nil))
		return
	}
	if err := h.svc.SetUserRole(r.Context(), *actorID, userID, req.Role, *req.Grant); err != nil {
		WriteAppError(w, err)
		return
	}
	action := "revoked"
	if *req.Grant {
		action = "granted"
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"role": req.Role, "action": action}, nil)
}

// SetUserStatus — SUPER_ADMIN: activate/suspend a user account.
func (h *AdminHandler) SetUserStatus(w http.ResponseWriter, r *http.Request) {
	actorID := h.requireSuperAdmin(w, r)
	if actorID == nil {
		return
	}
	userID, err := ParseUUID(r, "userId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetUserStatus(r.Context(), *actorID, userID, req.Status); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"status": req.Status}, nil)
}

// ConfirmManualPayment — admin confirms a manual/bank payment.
func (h *AdminHandler) ConfirmManualPayment(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	orderID, err := ParseUUID(r, "orderId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Note *string `json:"note"`
	}
	_ = DecodeJSON(r, &req)
	p, err := h.payments.ConfirmManualPayment(r.Context(), *adminID, orderID, req.Note)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"confirmed": true, "payment_id": p.ID.String(), "provider": p.Provider,
	}, nil)
}

// ── Payments operations (phase 38 P1) ──────────────────────────────────────

// GetOrder — GET /admin/orders/{orderId}
func (h *AdminHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	orderID, err := ParseUUID(r, "orderId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	view, err := h.svc.GetOrderDetailRich(r.Context(), orderID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, view, nil)
}

// ListOrders — GET /admin/orders?page=&page_size=
func (h *AdminHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	p := ParsePagination(r)
	list, total, err := h.svc.ListOrders(r.Context(), p.PageSize, (p.Page-1)*p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, p.Meta(total))
}

// RefundOrder — POST /admin/orders/{orderId}/refund {reason}
func (h *AdminHandler) RefundOrder(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	orderID, err := ParseUUID(r, "orderId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = DecodeJSON(r, &req)
	if err := h.payments.RefundOrder(r.Context(), orderID, adminID, req.Reason); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"refunded": true}, nil)
}

// ListPayouts — GET /admin/payouts?status= (enriched with tutor bank details).
func (h *AdminHandler) ListPayouts(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	status := r.URL.Query().Get("status")
	rows, err := h.svc.PayoutQueue(r.Context(), status)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"payouts":                  rows,
		"paystack_transfers":       h.svc.TransfersEnabled(),
		"paystack_transfer_method": "paystack",
	}, nil)
}

// PayoutViaPaystack — POST /admin/payouts/{payoutId}/paystack (admin).
// One-click bank transfer: returns needs_otp=true when the bank requires a
// finalize OTP.
func (h *AdminHandler) PayoutViaPaystack(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	payoutID, err := ParseUUID(r, "payoutId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	needsOTP, err := h.svc.PayoutViaPaystack(r.Context(), *adminID, payoutID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"initiated": true,
		"needs_otp": needsOTP,
		"message":   map[bool]string{true: "Transfer initiated — enter the OTP your bank sent.", false: "Transfer initiated."}[needsOTP],
	}, nil)
}

// CompletePaystackTransfer — POST /admin/payouts/{payoutId}/paystack/otp
// {otp} (admin). Finalizes the OTP-gated transfer.
func (h *AdminHandler) CompletePaystackTransfer(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	payoutID, err := ParseUUID(r, "payoutId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		OTP string `json:"otp"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	p, err := h.svc.CompletePaystackTransfer(r.Context(), *adminID, payoutID, req.OTP)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	// WhatsApp the tutor that their money is on the way.
	if h.notifier != nil && p != nil {
		name, phone, _, cerr := h.svc.PayoutTutorContact(r.Context(), payoutID)
		if cerr == nil && phone != "" {
			_ = name
			go func(phone string, amount float64, currency string) {
				nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				msg := fmt.Sprintf("💸 NUVORA: your payout of %.2f %s has been sent to your bank account via Paystack.", amount, currency)
				if err := h.notifier.SendWhatsAppTo(nctx, phone, msg); err != nil {
					slog.Error("whatsapp payout notify failed", "payout", payoutID, "error", err)
				}
			}(phone, p.Amount, p.Currency)
		}
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

// ConfirmPayoutPaid — POST /admin/payouts/{payoutId}/paid {provider_reference}
// (admin). Records the external bank transfer and notifies the tutor.
func (h *AdminHandler) ConfirmPayoutPaid(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	payoutID, err := ParseUUID(r, "payoutId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		ProviderReference string `json:"provider_reference"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if h.payments == nil || h.payments.PayoutSvc == nil {
		WriteAppError(w, pkg.Conflict("payout service not configured"))
		return
	}
	p, err := h.payments.PayoutSvc.ConfirmBankPayout(r.Context(), *adminID, payoutID, req.ProviderReference)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	// WhatsApp the tutor that their money is on the way.
	if h.notifier != nil && p != nil {
		name, phone, _, cerr := h.svc.PayoutTutorContact(r.Context(), payoutID)
		if cerr == nil && phone != "" {
			msg := "💸 NUVORA: your payout of " + fmt.Sprintf("%.2f", p.Amount) + " " + p.Currency +
				" has been sent to your bank account."
			_ = name
			go func(phone, msg string) {
				nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				if err := h.notifier.SendWhatsAppTo(nctx, phone, msg); err != nil {
					slog.Error("whatsapp payout notify failed", "payout", payoutID, "error", err)
				}
			}(phone, msg)
		}
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

// RequestCohortJoin — tutor asks to teach a cohort.
//
//	POST /api/v1/me/cohorts/{cohortId}/join  { "note": "..." }
func (h *AdminHandler) RequestCohortJoin(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !hasSessionRole(actor.Roles, "TUTOR") {
		WriteAppError(w, pkg.Forbidden("tutor access required"))
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Note *string `json:"note"`
	}
	_ = DecodeJSON(r, &req)
	jr, err := h.svc.RequestCohortJoinForUser(r.Context(), actor.UserID, cohortID, req.Note)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, jr, nil)
}

// ListCohortJoins — GET /admin/cohort-joins?status=
func (h *AdminHandler) ListCohortJoins(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	list, err := h.svc.ListCohortJoins(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// ReviewCohortJoin — POST /admin/cohort-joins/{id}/review {status}
// APPROVED assigns the tutor to the cohort.
func (h *AdminHandler) ReviewCohortJoin(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	jr, err := h.svc.ReviewCohortJoin(r.Context(), *adminID, id, req.Status)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, jr, nil)
}

// ProgrammeRoster — GET /admin/programmes/{slug}/roster
func (h *AdminHandler) ProgrammeRoster(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	slug := r.PathValue("slug")
	if slug == "" {
		WriteAppError(w, pkg.BadRequest("slug is required", nil))
		return
	}
	roster, err := h.svc.ProgrammeRoster(r.Context(), slug)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, roster, nil)
}

// UploadCohortBanner — POST /admin/cohorts/{cohortId}/banner (raw JPEG/PNG
// body). Uploads the image to the public bucket and stores its URL on the
// cohort. Rejects anything that is not a real JPEG/PNG file (never a pasted
// URL, never a renamed executable).
func (h *AdminHandler) UploadCohortBanner(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	if h.storage == nil {
		WriteAppError(w, pkg.Conflict("object storage is not configured"))
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20) // 11 MiB hard cap
	data, err := io.ReadAll(r.Body)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("could not read banner image: "+err.Error(), nil))
		return
	}
	if len(data) == 0 {
		WriteAppError(w, pkg.BadRequest("empty banner upload", nil))
		return
	}
	if h.rejectIfMalware(w, r, data) {
		return
	}
	ct := sniffImageType(data)
	if ct == "" {
		WriteAppError(w, pkg.BadRequest("banner must be a JPEG or PNG image (upload the file, not a URL)", nil))
		return
	}
	ext := ".jpg"
	if ct == "image/png" {
		ext = ".png"
	}
	key := "cohorts/" + cohortID.String() + ext
	if err := h.storage.Upload(r.Context(), storage.BucketPublic, key, data, ct); err != nil {
		WriteAppError(w, err)
		return
	}
	url := h.storage.GetPublicURL(storage.BucketPublic, key)
	if err := h.svc.SetCohortBanner(r.Context(), cohortID, url); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"banner_url": url, "content_type": ct, "size": len(data)}, nil)
}

// CreateProgramme — POST /admin/programmes (admin). Creates a DRAFT programme
// so its public page (/programmes/{slug}) exists; publish via
// /admin/programmes/{id}/status when ready.
func (h *AdminHandler) CreateProgramme(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	var req struct {
		Title      string   `json:"title"`
		Slug       string   `json:"slug"`
		Summary    *string  `json:"summary"`
		Format     string   `json:"format"`
		PriceMin   *float64 `json:"price_min"`
		PriceMax   *float64 `json:"price_max"`
		Currency   string   `json:"currency"`
		IsFeatured bool     `json:"is_featured"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	created, err := h.svc.CreateProgrammeAdmin(r.Context(), *adminID, service.CreateProgrammeInput{
		Title:      req.Title,
		Slug:       req.Slug,
		Summary:    req.Summary,
		Format:     academics.ProgrammeFormat(req.Format),
		PriceMin:   req.PriceMin,
		PriceMax:   req.PriceMax,
		Currency:   req.Currency,
		IsFeatured: req.IsFeatured,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, created, nil)
}

// ListTutors — GET /admin/tutors (admin console roster, APPROVED profiles).
func (h *AdminHandler) ListTutors(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	list, total, err := h.svc.ListApprovedTutors(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	p := ParsePagination(r)
	pkg.WriteSuccess(w, http.StatusOK, list, p.Meta(total))
}

// UpsertTutor — POST /admin/tutors (admin). Creates (or edits) a tutor
// account + vetting profile, optionally approving + publishing immediately.
func (h *AdminHandler) UpsertTutor(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	var req service.AdminUpsertTutorInput
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	profile, err := h.svc.UpsertTutorAdmin(r.Context(), *adminID, req)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, profile, nil)
}

// OperationsOverview — GET /admin/overview. One request for the admin home:
// stats, conversion funnel, money in flight and the attention queues.
func (h *AdminHandler) OperationsOverview(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	out, err := h.svc.OperationsOverview(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, out, nil)
}

// SendTestEmail — POST /admin/email/test (admin). Sends a branded test email
// to the acting admin's address so delivery can be verified end to end.
func (h *AdminHandler) SendTestEmail(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdmin(w, r)
	if adminID == nil {
		return
	}
	if h.mail == nil {
		WriteAppError(w, pkg.Conflict("email sender not configured"))
		return
	}
	email := ""
	if u, err := h.svc.UserEmail(r.Context(), *adminID); err == nil {
		email = u
	}
	if email == "" {
		WriteAppError(w, pkg.Conflict("could not resolve the admin email address"))
		return
	}
	if err := h.mail.Send(r.Context(), email, "NUVORA email delivery test",
		notification.BrandEmail(
			"<h1 style=\"margin:0 0 12px;font-size:20px;color:#0A1F44;\">Email delivery works ✅</h1>"+
				"<p style=\"margin:0 0 16px;\">This is a test email from your NUVORA platform.</p>"+
				"<p style=\"margin:0;\">If you can read this, login codes, verification links and payment receipts will reach your users.</p>")); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"sent": true, "to": email, "provider": notification.EmailProviderActive()}, nil)
}
