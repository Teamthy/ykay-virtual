package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/service"
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
}

func NewAdminHandler(svc *service.AdminService) *AdminHandler { return &AdminHandler{svc: svc} }

// WithPayments wires the payment service (manual payment confirmation).
func (h *AdminHandler) WithPayments(p *service.PaymentService) *AdminHandler {
	h.payments = p
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
	if h.requireAdmin(w, r) == nil {
		return
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
	pkg.WriteSuccess(w, http.StatusOK, users, p.Meta(int64(total)))
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

// ListPayouts — GET /admin/payouts?status=
func (h *AdminHandler) ListPayouts(w http.ResponseWriter, r *http.Request) {
	if h.requireAdmin(w, r) == nil {
		return
	}
	status := r.URL.Query().Get("status")
	list, err := h.svc.ListPayouts(r.Context(), status)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}
