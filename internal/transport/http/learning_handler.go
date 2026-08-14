package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// LearningHandler — Learning, Assessment & Reporting surface:
//   - POST /learning/assessments                     (tutor: create quiz)
//   - GET  /learning/assessments?cohort_id=          (student: list published)
//   - POST /learning/assessments/{id}/start          (student: begin attempt)
//   - POST /learning/assessments/{id}/submit         (student: auto-grade)
//   - GET  /learning/assignments/{id}/submissions    (tutor: gradebook)
//   - POST /learning/submissions/{id}/grade          (tutor: score+feedback)
//   - POST /learning/progress-reports                (tutor: write report)
//   - GET  /learning/progress-reports?student_profile_id=  (student/parent)
//   - GET  /admin/analytics                          (admin)
//   - GET  /admin/reports/attendance.csv             (admin export)
//   - GET  /admin/reports/revenue.csv                (admin export)

type LearningHandler struct {
	svc        *service.LearningService
	an         *service.AnalyticsService
	attendance bookingAttendanceLister
	authz      *ProfileAuthorizer
}

type bookingAttendanceLister interface {
	ListLessonAttendance(ctx context.Context, lessonID uuid.UUID) ([]booking.Attendance, error)
}

func NewLearningHandler(svc *service.LearningService, an *service.AnalyticsService, attendance bookingAttendanceLister, authz *ProfileAuthorizer) *LearningHandler {
	return &LearningHandler{svc: svc, an: an, attendance: attendance, authz: authz}
}

// --- Assessments ---

func (h *LearningHandler) CreateAssessment(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		TutorProfileID string                            `json:"tutor_profile_id"`
		CohortID       string                            `json:"cohort_id"`
		Title          string                            `json:"title"`
		Instructions   *string                           `json:"instructions"`
		PassThreshold  float64                           `json:"pass_threshold"`
		DueAt          *string                           `json:"due_at"`
		Questions      []service.AssessmentQuestionInput `json:"questions"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, req.TutorProfileID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var cohortID *uuid.UUID
	if req.CohortID != "" {
		id, err := uuid.Parse(req.CohortID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("cohort_id must be a valid UUID", nil))
			return
		}
		cohortID = &id
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
	a, err := h.svc.CreateAssessment(r.Context(), service.CreateAssessmentInput{
		AuthorUserID:   actor.UserID,
		TutorProfileID: tutorID,
		CohortID:       cohortID,
		Title:          req.Title,
		Instructions:   req.Instructions,
		PassThreshold:  req.PassThreshold,
		DueAt:          dueAt,
		Questions:      req.Questions,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, a, nil)
}

func (h *LearningHandler) ListAssessments(w http.ResponseWriter, r *http.Request) {
	cohortID, err := uuid.Parse(r.URL.Query().Get("cohort_id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("cohort_id query param is required", nil))
		return
	}
	list, err := h.svc.ListAssessmentsByCohort(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *LearningHandler) StartAssessment(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	assessmentID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	start, err := h.svc.StartAssessment(r.Context(), studentID, assessmentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, start, nil)
}

func (h *LearningHandler) SubmitAssessment(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	assessmentID, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Answers []service.AssessmentAnswer `json:"answers"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	result, err := h.svc.SubmitAssessmentForStudent(r.Context(), studentID, assessmentID, req.Answers)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, result, nil)
}

// --- Grading ---

func (h *LearningHandler) ListSubmissions(w http.ResponseWriter, r *http.Request) {
	assignmentID, err := ParseUUID(r, "assignmentId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListSubmissionsByAssignment(r.Context(), assignmentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *LearningHandler) GradeSubmission(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	submissionID, err := ParseUUID(r, "submissionId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Score    *float64 `json:"score"`
		Feedback *string  `json:"feedback"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.GradeSubmission(r.Context(), actor.UserID, submissionID, req.Score, req.Feedback); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"graded": true}, nil)
}

// --- Progress reports ---

func (h *LearningHandler) CreateProgressReport(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		StudentProfileID string  `json:"student_profile_id"`
		TutorProfileID   string  `json:"tutor_profile_id"`
		CohortID         string  `json:"cohort_id"`
		PeriodStart      string  `json:"period_start"`
		PeriodEnd        string  `json:"period_end"`
		Strengths        *string `json:"strengths"`
		Weaknesses       *string `json:"weaknesses"`
		Recommendations  *string `json:"recommendations"`
		OverallRating    *int    `json:"overall_rating"`
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
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, req.TutorProfileID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	start, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("period_start must be YYYY-MM-DD", nil))
		return
	}
	end, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("period_end must be YYYY-MM-DD", nil))
		return
	}
	var cohortID *uuid.UUID
	if req.CohortID != "" {
		id, err := uuid.Parse(req.CohortID)
		if err == nil {
			cohortID = &id
		}
	}
	report, err := h.svc.CreateProgressReport(r.Context(), service.CreateReportInput{
		TutorUserID:      actor.UserID,
		StudentProfileID: studentID,
		TutorProfileID:   tutorID,
		CohortID:         cohortID,
		PeriodStart:      start,
		PeriodEnd:        end,
		Strengths:        req.Strengths,
		Weaknesses:       req.Weaknesses,
		Recommendations:  req.Recommendations,
		OverallRating:    req.OverallRating,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, report, nil)
}

func (h *LearningHandler) ListProgressReports(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	// Tutor-scoped listing (reports the tutor has written)…
	if raw := r.URL.Query().Get("tutor_profile_id"); raw != "" {
		tutorID, err := h.authz.ResolveTutor(r.Context(), actor, raw)
		if err != nil {
			WriteAppError(w, err)
			return
		}
		list, err := h.svc.ListProgressByTutor(r.Context(), tutorID)
		if err != nil {
			WriteAppError(w, err)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, list, nil)
		return
	}
	// …a bare TUTOR session lists its own written reports…
	rawStudent := r.URL.Query().Get("student_profile_id")
	if rawStudent == "" && hasSessionRole(actor.Roles, "TUTOR") &&
		!hasSessionRole(actor.Roles, "STUDENT") && !hasSessionRole(actor.Roles, "PARENT") {
		tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
		if err != nil {
			WriteAppError(w, err)
			return
		}
		list, err := h.svc.ListProgressByTutor(r.Context(), tutorID)
		if err != nil {
			WriteAppError(w, err)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, list, nil)
		return
	}
	// …else student/parent-scoped listing (session-resolved learner).
	if rawStudent == "" && !hasSessionRole(actor.Roles, "STUDENT") && !hasSessionRole(actor.Roles, "PARENT") {
		WriteAppError(w, pkg.BadRequest("student_profile_id or tutor_profile_id query param is required", nil))
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, rawStudent)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListProgressByStudent(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// --- Analytics (admin) ---

func (h *LearningHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	funnel, err := h.an.Funnel(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	cohorts, err := h.an.CohortAnalytics(r.Context(), 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	revenue, err := h.an.RevenueByProgramme(r.Context(), 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"funnel": funnel, "cohorts": cohorts, "revenue": revenue,
	}, nil)
}

// --- CSV exports (FR-24) ---

func (h *LearningHandler) AttendanceCSV(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	lessonID, err := uuid.Parse(r.URL.Query().Get("lesson_id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("lesson_id query param is required", nil))
		return
	}
	if h.attendance == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "attendance store unavailable", nil)
		return
	}
	rows, err := h.attendance.ListLessonAttendance(r.Context(), lessonID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=attendance.csv")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("student_profile_id,status,marked_at\n"))
	for _, a := range rows {
		_, _ = w.Write([]byte(a.StudentProfileID.String() + "," + a.Status + "," + a.MarkedAt.Format(time.RFC3339) + "\n"))
	}
}

// RevenueCSV — admin export of revenue grouped by programme (phase 11c).
func (h *LearningHandler) RevenueCSV(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	rows, err := h.an.RevenueByProgramme(r.Context(), 1000)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=revenue.csv")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("programme_id,programme_title,revenue,orders\n"))
	for _, rw := range rows {
		_, _ = fmt.Fprintf(w, "%s,%s,%.2f,%d\n", rw.ProgrammeID, rw.ProgrammeTitle, rw.Revenue, rw.Orders)
	}
}
