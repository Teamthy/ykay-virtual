package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/library"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// LibraryHandler — on-demand recorded-lesson library.
//
// Public (catalogue browse + featured + detail) are anonymous-cacheable GETs;
// the video URL / transcript are stripped for non-participants by the service,
// so a shared public cache can never leak paid content. Admin routes require a
// staff session.
type LibraryHandler struct {
	svc *service.LibraryService
}

func NewLibraryHandler(svc *service.LibraryService) *LibraryHandler {
	return &LibraryHandler{svc: svc}
}

// parseQueryUUIDOpt parses an optional uuid query param.
func parseQueryUUIDOpt(r *http.Request, key string) (*uuid.UUID, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return nil, nil
	}
	u, err := uuid.Parse(raw)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func actorFor(r *http.Request) (uuid.UUID, bool) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		return uuid.Nil, false
	}
	return actor.UserID, actor.IsAdmin
}

// Catalogue — GET /api/v1/library (public browse).
func (h *LibraryHandler) Catalogue(w http.ResponseWriter, r *http.Request) {
	userID, isAdmin := actorFor(r)
	p := ParsePagination(r)

	f := library.Filter{
		Search:       r.URL.Query().Get("q"),
		FeaturedOnly: r.URL.Query().Get("featured") == "true",
		Page:         p.Page,
		PageSize:     p.PageSize,
	}
	var err error
	if f.ProgrammeID, err = parseQueryUUIDOpt(r, "programme_id"); err != nil {
		WriteAppError(w, pkg.BadRequest("invalid programme_id", nil))
		return
	}
	if f.SubjectID, err = parseQueryUUIDOpt(r, "subject_id"); err != nil {
		WriteAppError(w, pkg.BadRequest("invalid subject_id", nil))
		return
	}
	if f.LevelID, err = parseQueryUUIDOpt(r, "level_id"); err != nil {
		WriteAppError(w, pkg.BadRequest("invalid level_id", nil))
		return
	}
	if f.CurriculumID, err = parseQueryUUIDOpt(r, "curriculum_id"); err != nil {
		WriteAppError(w, pkg.BadRequest("invalid curriculum_id", nil))
		return
	}

	items, total, err := h.svc.Catalogue(r.Context(), f, isAdmin, userID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, items, p.Meta(total))
}

// Featured — GET /api/v1/library/featured (public homepage rail).
func (h *LibraryHandler) Featured(w http.ResponseWriter, r *http.Request) {
	p := ParsePagination(r)
	items, err := h.svc.Featured(r.Context(), p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, items, nil)
}

// Get — GET /api/v1/library/{lessonId} (public detail; gated playback).
func (h *LibraryHandler) Get(w http.ResponseWriter, r *http.Request) {
	lessonID, err := uuid.Parse(r.PathValue("lessonId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid lesson id", nil))
		return
	}
	userID, isAdmin := actorFor(r)
	it, err := h.svc.Get(r.Context(), lessonID, isAdmin, userID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, it, nil)
}

// ListAdmin — GET /api/v1/admin/library (admin content manager).
func (h *LibraryHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
	if actor, _ := middleware.ActorFromContext(r.Context()); !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	p := ParsePagination(r)
	items, total, err := h.svc.ListAdmin(r.Context(), r.URL.Query().Get("q"), p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, items, p.Meta(total))
}

// UpdateMeta — PUT /api/v1/admin/library/{lessonId} (admin curation).
func (h *LibraryHandler) UpdateMeta(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
	if actor, _ := middleware.ActorFromContext(r.Context()); !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	lessonID, err := uuid.Parse(r.PathValue("lessonId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid lesson id", nil))
		return
	}
	var req struct {
		Visible         *bool   `json:"visible"`
		Featured        *bool   `json:"featured"`
		ThumbnailURL    *string `json:"thumbnail_url"`
		DurationSeconds *int    `json:"duration_seconds"`
		SortOrder       *int    `json:"sort_order"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in := library.UpdateMetaInput{
		Visible:         req.Visible,
		Featured:        req.Featured,
		ThumbnailURL:    req.ThumbnailURL,
		DurationSeconds: req.DurationSeconds,
		SortOrder:       req.SortOrder,
	}
	if err := h.svc.UpdateMeta(r.Context(), lessonID, in); err != nil {
		WriteAppError(w, err)
		return
	}
	it, err := h.svc.Get(r.Context(), lessonID, true, uuid.Nil)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, it, nil)
}
