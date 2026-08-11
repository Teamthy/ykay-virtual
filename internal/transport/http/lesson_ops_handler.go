package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// LessonOpsHandler — teaching operations:
//   - GET  /api/v1/cohorts/{id}/lessons         (public session schedule)
//   - POST /api/v1/lessons/{id}/attendance      (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/attendance
//   - POST /api/v1/lessons/{id}/notes           (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/notes
//   - GET  /api/v1/cohorts/{id}/resources
//   - GET  /api/v1/cohorts/{id}/assignments

type LessonOpsHandler struct {
	svc *service.LessonService
}

func NewLessonOpsHandler(svc *service.LessonService) *LessonOpsHandler {
	return &LessonOpsHandler{svc: svc}
}

func (h *LessonOpsHandler) ListCohortLessons(w http.ResponseWriter, r *http.Request) {
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	lessons, err := h.svc.ListCohortLessons(r.Context(), cohortID, 100)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
}

func (h *LessonOpsHandler) MarkAttendance(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		StudentProfileID string  `json:"student_profile_id"`
		Status           string  `json:"status"`
		Note             *string `json:"note"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	studentID, err := uuid.Parse(req.StudentProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("student_profile_id must be a valid UUID", nil))
		return
	}
	if err := h.svc.MarkAttendance(r.Context(), actor.UserID, lessonID, studentID, req.Status, req.Note); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"marked": true, "status": req.Status}, nil)
}

func (h *LessonOpsHandler) ListAttendance(w http.ResponseWriter, r *http.Request) {
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListLessonAttendance(r.Context(), lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *LessonOpsHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		StudentProfileID  string  `json:"student_profile_id"`
		Content           string  `json:"content"`
		Homework          *string `json:"homework"`
		IsVisibleToParent bool    `json:"is_visible_to_parent"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var studentID *uuid.UUID
	if req.StudentProfileID != "" {
		id, err := uuid.Parse(req.StudentProfileID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("student_profile_id must be a valid UUID", nil))
			return
		}
		studentID = &id
	}
	note, err := h.svc.AddLessonNote(r.Context(), actor.UserID, lessonID, studentID,
		req.Content, req.Homework, req.IsVisibleToParent)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, note, nil)
}

func (h *LessonOpsHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	notes, err := h.svc.ListLessonNotes(r.Context(), lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, notes, nil)
}

func (h *LessonOpsHandler) ListResources(w http.ResponseWriter, r *http.Request) {
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.ListCohortResources(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}

func (h *LessonOpsHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	assignments, err := h.svc.ListCohortAssignments(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, assignments, nil)
}

var _ = booking.Lesson{}
