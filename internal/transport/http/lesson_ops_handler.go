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
//   - GET  /api/v1/cohorts/{id}/lessons         (public schedule DTO, or full for accessible callers)
//   - POST /api/v1/lessons/{id}/attendance      (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/attendance      (tutor, own lesson only — learner records)
//   - POST /api/v1/lessons/{id}/notes           (tutor, own lesson only)
//   - GET  /api/v1/lessons/{id}/notes           (tutor/enrolled learner/admin)
//   - GET  /api/v1/cohorts/{id}/resources       (tutor/enrolled learner/admin)
//   - GET  /api/v1/cohorts/{id}/assignments     (tutor/enrolled learner/admin)
//
// SECURITY (YK-002/A-02): live classroom meeting URLs, paid video URLs,
// attendance (learner records) and notes/homework must never be reachable by
// anonymous callers. The public cohort schedule is exposed through a redacted
// DTO that carries only id/title/times/timezone/status — never
// meeting_url/video_url. Ownership is enforced in the service layer (A-02):
// tutors act only on their own lessons/cohorts, and content reads require
// tutor ownership, platform admin, or enrollment.

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
// roster) are tutor/admin-only. Returns the authenticated actor for the
// service-layer ownership check (A-02).
func (h *LessonOpsHandler) requireTutor(w http.ResponseWriter, r *http.Request) *middleware.Actor {
	actor := requireActor(w, r)
	if actor == nil {
		return nil
	}
	for _, role := range actor.Roles {
		if role == "TUTOR" || role == "SUPER_ADMIN" || role == "ACADEMIC_ADMIN" {
			return actor
		}
	}
	WriteAppError(w, pkg.Forbidden("tutor access required"))
	return nil
}

func NewLessonOpsHandler(svc *service.LessonService) *LessonOpsHandler {
	return &LessonOpsHandler{svc: svc}
}

// requireAdminActor — scheduling/admin actions require a platform admin role.
func (h *LessonOpsHandler) requireAdminActor(w http.ResponseWriter, r *http.Request) *middleware.Actor {
	actor := requireActor(w, r)
	if actor == nil {
		return nil
	}
	for _, role := range actor.Roles {
		if role == "SUPER_ADMIN" || role == "ACADEMIC_ADMIN" {
			return actor
		}
	}
	WriteAppError(w, pkg.Forbidden("admin access required"))
	return nil
}

// ScheduleLesson — admin schedules a live lesson with the FR-10 / AC-05
// double-booking guard (a tutor cannot be booked for two overlapping lessons).
//
//	POST /api/v1/admin/lessons
func (h *LessonOpsHandler) ScheduleLesson(w http.ResponseWriter, r *http.Request) {
	if h.requireAdminActor(w, r) == nil {
		return
	}
	var req struct {
		CohortID         string `json:"cohort_id"`
		PrivatePackageID string `json:"private_package_id"`
		TutorProfileID   string `json:"tutor_profile_id"`
		Title            string `json:"title"`
		Description      string `json:"description"`
		StartAt          string `json:"start_at"`
		EndAt            string `json:"end_at"`
		Timezone         string `json:"timezone"`
		MeetingProvider  string `json:"meeting_provider"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, err := uuid.Parse(req.TutorProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
		return
	}
	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("start_at must be RFC3339 (e.g. 2026-09-01T15:00:00Z)", nil))
		return
	}
	endAt, err := time.Parse(time.RFC3339, req.EndAt)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("end_at must be RFC3339 (e.g. 2026-09-01T16:00:00Z)", nil))
		return
	}
	in := service.ScheduleLessonInput{
		TutorProfileID:  tutorID,
		Title:           req.Title,
		StartAt:         startAt,
		EndAt:           endAt,
		Timezone:        req.Timezone,
		MeetingProvider: req.MeetingProvider,
	}
	if req.Description != "" {
		in.Description = &req.Description
	}
	if req.CohortID != "" {
		id, err := uuid.Parse(req.CohortID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("cohort_id must be a valid UUID", nil))
			return
		}
		in.CohortID = &id
	}
	if req.PrivatePackageID != "" {
		id, err := uuid.Parse(req.PrivatePackageID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("private_package_id must be a valid UUID", nil))
			return
		}
		in.PrivatePackageID = &id
	}
	lesson, err := h.svc.ScheduleLesson(r.Context(), in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, lesson, nil)
}

// SetRecordedVideo — POST /api/v1/admin/lessons/{lessonId}/video (admin/tutor).
// Attaches (or clears) a recorded-lesson video URL.
func (h *LessonOpsHandler) SetRecordedVideo(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		VideoURL *string `json:"video_url"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetRecordedVideo(r.Context(), actor.UserID, actor.IsAdmin, lessonID, req.VideoURL); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"lesson_id": lessonID, "video_url": req.VideoURL}, nil)
}

// MyRecordedLibrary — GET /api/v1/me/recorded-lessons (owner). The learner's
// recorded-lesson library across their enrolled cohorts.
func (h *LessonOpsHandler) MyRecordedLibrary(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID := r.URL.Query().Get("student_profile_id")
	if studentID == "" {
		WriteAppError(w, pkg.BadRequest("student_profile_id is required", nil))
		return
	}
	sid, err := uuid.Parse(studentID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid student_profile_id", nil))
		return
	}
	lessons, err := h.svc.ListRecordedLibrary(r.Context(), actor.UserID, actor.IsAdmin, sid, 100)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
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
	// A-02: authenticated callers also get the redacted view unless they can
	// access the cohort (admin, the cohort's tutor, or an enrolled learner).
	if actor, ok := middleware.ActorFromContext(r.Context()); !ok || actor.UserID == uuid.Nil {
		pkg.WriteSuccess(w, http.StatusOK, toPublicLessonView(lessons), nil)
		return
	} else if !h.svc.CanAccessCohort(r.Context(), actor.UserID, actor.IsAdmin, cohortID) {
		pkg.WriteSuccess(w, http.StatusOK, toPublicLessonView(lessons), nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
}

func (h *LessonOpsHandler) MarkAttendance(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
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
	if err := h.svc.MarkAttendance(r.Context(), actor.UserID, actor.IsAdmin, lessonID, studentID, req.Status, req.Note); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"marked": true, "status": req.Status}, nil)
}

// ListAttendance — GET /lessons/{lessonId}/attendance (tutor roster).
// Learner attendance/IDs are sensitive; tutor-owner/admin only (YK-002/A-02).
func (h *LessonOpsHandler) ListAttendance(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListLessonAttendance(r.Context(), actor.UserID, actor.IsAdmin, lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *LessonOpsHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
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
	note, err := h.svc.AddLessonNote(r.Context(), actor.UserID, actor.IsAdmin, lessonID, studentID,
		req.Content, req.Homework, req.IsVisibleToParent)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, note, nil)
}

// ListNotes — GET /lessons/{lessonId}/notes. Notes/homework are sensitive;
// the service enforces tutor-owner/admin/enrolled-learner access (A-02).
func (h *LessonOpsHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	notes, err := h.svc.ListLessonNotes(r.Context(), actor.UserID, actor.IsAdmin, lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, notes, nil)
}

// ListResources — GET /cohorts/{id}/resources. Cohort content (may be paid /
// tutor-authored); the service enforces access (A-02).
func (h *LessonOpsHandler) ListResources(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.ListCohortResources(r.Context(), actor.UserID, actor.IsAdmin, cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}

// ListAssignments — GET /cohorts/{id}/assignments. Require an authenticated
// actor; the service enforces access (A-02).
func (h *LessonOpsHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	assignments, err := h.svc.ListCohortAssignments(r.Context(), actor.UserID, actor.IsAdmin, cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, assignments, nil)
}

// CreateAssignment — POST /cohorts/{id}/assignments (tutor console).
func (h *LessonOpsHandler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
	if actor == nil {
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
	a, err := h.svc.CreateAssignment(r.Context(), actor.UserID, actor.IsAdmin, cohortID, req.Title, req.Instructions, dueAt, req.MaxScore)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, a, nil)
}

// CreateResource — POST /cohorts/{id}/resources (tutor console).
func (h *LessonOpsHandler) CreateResource(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
	if actor == nil {
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
	res, err := h.svc.CreateResource(r.Context(), actor.UserID, actor.IsAdmin, cohortID, req.Title, req.Description, req.FileURL)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, res, nil)
}

// ListCohortEnrollments — GET /cohorts/{id}/enrollments (tutor roster).
func (h *LessonOpsHandler) ListCohortEnrollments(w http.ResponseWriter, r *http.Request) {
	actor := h.requireTutor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListCohortEnrollments(r.Context(), actor.UserID, actor.IsAdmin, cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

var _ = booking.Lesson{}
