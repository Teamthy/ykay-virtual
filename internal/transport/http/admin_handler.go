package httpapi

import (
	"net/http"

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
	svc *service.AdminService
}

func NewAdminHandler(svc *service.AdminService) *AdminHandler { return &AdminHandler{svc: svc} }

func (h *AdminHandler) requireAdmin(w http.ResponseWriter, r *http.Request) *uuid.UUID {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return nil
	}
	return &actor.UserID
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
