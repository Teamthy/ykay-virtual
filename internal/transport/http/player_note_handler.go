package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// PlayerNoteHandler — lesson bookmarks & timestamped player notes (feature 5).
// Access is scoped to lesson participants: the same LessonService gate that
// guards the tutor's lesson notes is reused here, so only the lesson's
// tutor / enrolled learner (or their parent) / admin may read or write.
type PlayerNoteHandler struct {
	svc       *service.LessonNoteService
	lessonSvc *service.LessonService
}

func NewPlayerNoteHandler(svc *service.LessonNoteService, lessonSvc *service.LessonService) *PlayerNoteHandler {
	return &PlayerNoteHandler{svc: svc, lessonSvc: lessonSvc}
}

// Add — POST /api/v1/lessons/{lessonId}/player-notes.
func (h *PlayerNoteHandler) Add(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if _, err := h.lessonSvc.ListLessonNotes(r.Context(), actor.UserID, actor.IsAdmin, lessonID); err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Role         string `json:"role"`
		TimestampSec int    `json:"timestamp_sec"`
		IsBookmark   bool   `json:"is_bookmark"`
		Text         string `json:"text"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	note, err := h.svc.Add(r.Context(), lessonID, actor.UserID, req.Role, req.TimestampSec, req.IsBookmark, req.Text)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, note, nil)
}

// List — GET /api/v1/lessons/{lessonId}/player-notes (shared participant view).
func (h *PlayerNoteHandler) List(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if _, err := h.lessonSvc.ListLessonNotes(r.Context(), actor.UserID, actor.IsAdmin, lessonID); err != nil {
		WriteAppError(w, err)
		return
	}
	notes, err := h.svc.ListByLesson(r.Context(), lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, notes, nil)
}

// Delete — DELETE /api/v1/me/player-notes/{id} (owner only).
func (h *PlayerNoteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.Delete(r.Context(), id, actor.UserID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
}
