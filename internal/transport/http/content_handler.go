package httpapi

import (
	"net/http"
	"strings"

	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// ContentHandler — blog + redirects + related content:
//   - GET /api/v1/content/blog?subject=&exam=&page=
//   - GET /api/v1/content/blog/{slug}
//   - GET /api/v1/subjects/{slug}/related
//   - GET /api/v1/redirects/{slug}          → 301 mapping (or 404)

type ContentHandler struct {
	svc *service.ContentService
}

func NewContentHandler(svc *service.ContentService) *ContentHandler {
	return &ContentHandler{svc: svc}
}

func (h *ContentHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	p := ParsePagination(r)
	params := content.BlogListParams{
		Subject:  firstNonEmpty(r.URL.Query().Get("subject"), p.Filters["subject"]),
		Exam:     firstNonEmpty(r.URL.Query().Get("exam"), p.Filters["exam"]),
		Page:     p.Page,
		PageSize: p.PageSize,
		Sort:     p.Sort,
	}
	posts, total, err := h.svc.ListPosts(r.Context(), params)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, posts, p.Meta(total))
}

func (h *ContentHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	post, err := h.svc.GetPostBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if post == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "post not found", nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, post, nil)
}

func (h *ContentHandler) Related(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	related, err := h.svc.RelatedContent(r.Context(), slug)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, related, nil)
}

func (h *ContentHandler) ResolveRedirect(w http.ResponseWriter, r *http.Request) {
	rm, err := h.svc.ResolveRedirect(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if rm == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "no redirect for this slug", nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, rm, nil)
}

// ListTestimonials — GET /api/v1/content/testimonials (public, consent-gated).
func (h *ContentHandler) ListTestimonials(w http.ResponseWriter, r *http.Request) {
	featured := r.URL.Query().Get("featured") == "true"
	list, err := h.svc.ListTestimonials(r.Context(), featured, 20)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// CreateTestimonial — POST /api/v1/admin/testimonials (admin-managed).
func (h *ContentHandler) CreateTestimonial(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	var req struct {
		AuthorName     string  `json:"author_name"`
		AuthorLocation *string `json:"author_location"`
		AuthorRole     *string `json:"author_role"`
		Body           string  `json:"body"`
		Rating         *int    `json:"rating"`
		IsFeatured     bool    `json:"is_featured"`
		ConsentGiven   bool    `json:"consent_given"`
		IsPublic       bool    `json:"is_public"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	t, err := h.svc.CreateTestimonial(r.Context(), actor.UserID, &content.Testimonial{
		AuthorName: req.AuthorName, AuthorLocation: req.AuthorLocation, AuthorRole: req.AuthorRole,
		Body: req.Body, Rating: req.Rating, IsFeatured: req.IsFeatured,
		ConsentGiven: req.ConsentGiven, IsPublic: req.IsPublic,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, t, nil)
}
