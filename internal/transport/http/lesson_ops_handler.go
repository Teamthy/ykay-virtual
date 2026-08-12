package httpapi

import (
	"net/http"
	"time"

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

// requireTutor — authoring endpoints (assignments, resources, quizzes,
// roster) are tutor/admin-only.
func (h *LessonOpsHandler) requireTutor(w http.ResponseWriter, r *http.Request) *uuid.UUID {
	actor := requireActor(w, r)
	if actor == nil {
		return nil
	}
	for _, role := range actor.Roles {
		if role == "TUTOR" || role == "SUPER_ADMIN" || role == "ACADEMIC_ADMIN" || role == "INSTITUTION_ADMIN" {
			return &actor.UserID
		}
	}
	WriteAppError(w, pkg.Forbidden("tutor access required"))
	return nil
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

// CreateAssignment — POST /cohorts/{id}/assignments (tutor console).
func (h *LessonOpsHandler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	if h.requireTutor(w, r) == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Title        string   `json:"title"`
		Instructions *string  `json:"instructions"`
		DueAt        *string  `json:"due_at"`
		MaxScore     *float64 `json:"max_score"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var dueAt *time.Time
	if req.DueAt != nil && *req.DueAt != "" {
		t, err := time.Parse(time.RFC3339, *req.DueAt)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("due_at must be RFC3339", nil))
			return
		}
		dueAt = &t
	}
	a, err := h.svc.CreateAssignment(r.Context(), cohortID, req.Title, req.Instructions, dueAt, req.MaxScore)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, a, nil)
}

// CreateResource — POST /cohorts/{id}/resources (tutor console).
func (h *LessonOpsHandler) CreateResource(w http.ResponseWriter, r *http.Request) {
	if h.requireTutor(w, r) == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
		FileURL     *string `json:"file_url"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.CreateResource(r.Context(), cohortID, req.Title, req.Description, req.FileURL)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, res, nil)
}

// ListCohortEnrollments — GET /cohorts/{id}/enrollments (tutor roster).
func (h *LessonOpsHandler) ListCohortEnrollments(w http.ResponseWriter, r *http.Request) {
	if h.requireTutor(w, r) == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListCohortEnrollments(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

var _ = booking.Lesson{}
