package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// LessonOpsHandler — teaching operations:
//   - GET  /api/v1/cohorts/{id}/lessons         (public schedule DTO, or full for authenticated)
//   - POST /api/v1/lessons/{id}/attendance      (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/attendance      (tutor only — learner records)
//   - POST /api/v1/lessons/{id}/notes           (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/notes           (authenticated — homework/notes)
//   - GET  /api/v1/cohorts/{id}/resources       (authenticated)
//   - GET  /api/v1/cohorts/{id}/assignments     (authenticated)
//
// SECURITY (YK-002): live classroom meeting URLs, paid video URLs, attendance
// (learner records) and notes/homework must never be reachable by anonymous
// callers. The public cohort schedule is exposed through a redacted DTO that
// carries only id/title/times/timezone/status — never meeting_url/video_url.

// publicLessonView — redacted schedule row safe for unauthenticated output.
type publicLessonView struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	StartAt  time.Time `json:"start_at"`
	EndAt    time.Time `json:"end_at"`
	Timezone string    `json:"timezone"`
	Status   string    `json:"status"`
}

func toPublicLessonView(ls []booking.Lesson) []publicLessonView {
	out := make([]publicLessonView, 0, len(ls))
	for _, l := range ls {
		out = append(out, publicLessonView{
			ID:       l.ID,
			Title:    l.Title,
			StartAt:  l.StartAt,
			EndAt:    l.EndAt,
			Timezone: l.Timezone,
			Status:   string(l.Status),
		})
	}
	return out
}

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
	// YK-002: unauthenticated callers get the redacted schedule DTO only.
	// meeting_url / video_url are private (live classrooms + paid videos).
	if actor, ok := middleware.ActorFromContext(r.Context()); !ok || actor.UserID == uuid.Nil {
		pkg.WriteSuccess(w, http.StatusOK, toPublicLessonView(lessons), nil)
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

// ListAttendance — GET /lessons/{lessonId}/attendance (tutor roster).
// Learner attendance/IDs are sensitive; tutor-only (YK-002).
func (h *LessonOpsHandler) ListAttendance(w http.ResponseWriter, r *http.Request) {
	if h.requireTutor(w, r) == nil {
		return
	}
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

// ListNotes — GET /lessons/{lessonId}/notes. Notes/homework are sensitive;
// require an authenticated actor (YK-002).
func (h *LessonOpsHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
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

// ListResources — GET /cohorts/{id}/resources. Cohort content (may be paid /
// tutor-authored); require an authenticated actor (YK-002).
func (h *LessonOpsHandler) ListResources(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
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

// ListAssignments — GET /cohorts/{id}/assignments. Require an authenticated
// actor (YK-002).
func (h *LessonOpsHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
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
