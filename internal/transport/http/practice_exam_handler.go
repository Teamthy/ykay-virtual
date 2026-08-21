package httpapi

import (
	"errors"
	"net/http"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// PracticeExamHandler — CBT practice exams:
//   - tutor: POST/GET /tutor/exams, GET/PUT/DELETE /tutor/exams/{id}
//   - student: GET /learning/exams, GET /learning/exams/{id},
//     POST /learning/exams/{id}/attempts,
//     POST /learning/exams/attempts/{attemptId}/submit,
//     GET /learning/exams/attempts, GET /learning/exams/attempts/{attemptId}
type PracticeExamHandler struct {
	svc   *service.PracticeExamService
	authz *ProfileAuthorizer
}

func NewPracticeExamHandler(svc *service.PracticeExamService, authz *ProfileAuthorizer) *PracticeExamHandler {
	return &PracticeExamHandler{svc: svc, authz: authz}
}

// writeExamError maps practice sentinels onto the shared API error surface.
func writeExamError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, practice.ErrNotFound), errors.Is(err, practice.ErrAttemptNotFound):
		WriteAppError(w, domain.ErrNotFound)
	case errors.Is(err, practice.ErrNotOwner), errors.Is(err, practice.ErrNotAvailable):
		WriteAppError(w, domain.ErrForbidden)
	case errors.Is(err, practice.ErrAttemptSubmitted):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), "attempt already submitted", nil)
	case errors.Is(err, practice.ErrAttemptNotMarked):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), "attempt is still in progress", nil)
	default:
		WriteAppError(w, err)
	}
}

func examPathID(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	raw := r.PathValue(name)
	id, err := uuid.Parse(raw)
	if err != nil {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), name+" must be a valid UUID", nil)
		return uuid.Nil, false
	}
	return id, true
}

// ---- DTOs -------------------------------------------------------------------

type examQuestionDTO struct {
	ID           uuid.UUID `json:"id"`
	Position     int       `json:"position"`
	Text         string    `json:"text"`
	Options      []string  `json:"options"`
	CorrectIndex int       `json:"correct_index,omitempty"` // tutor view only
	Explanation  string    `json:"explanation,omitempty"`
}

type examDTO struct {
	ID              uuid.UUID         `json:"id"`
	Subject         string            `json:"subject"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	DurationMinutes int               `json:"duration_minutes"`
	PassingScore    int               `json:"passing_score"`
	CohortID        *uuid.UUID        `json:"cohort_id,omitempty"`
	Status          string            `json:"status"`
	QuestionCount   int               `json:"question_count"`
	Questions       []examQuestionDTO `json:"questions,omitempty"`
	CreatedAt       string            `json:"created_at"`
}

func examToDTO(e *practice.Exam, withQuestions bool) examDTO {
	d := examDTO{
		ID:              e.ID,
		Subject:         e.Subject,
		Title:           e.Title,
		Description:     e.Description,
		DurationMinutes: e.DurationMinutes,
		PassingScore:    e.PassingScore,
		CohortID:        e.CohortID,
		Status:          e.Status,
		QuestionCount:   len(e.Questions),
		CreatedAt:       e.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
	if withQuestions {
		d.Questions = make([]examQuestionDTO, len(e.Questions))
		for i, q := range e.Questions {
			d.Questions[i] = examQuestionDTO{ID: q.ID, Position: q.Position, Text: q.Text, Options: q.Options, CorrectIndex: q.CorrectIndex, Explanation: q.Explanation}
		}
	}
	return d
}

// playerDTO — questions without the correct answer (student view).
type playerQuestionDTO struct {
	ID       uuid.UUID `json:"id"`
	Position int       `json:"position"`
	Text     string    `json:"text"`
	Options  []string  `json:"options"`
}

// ---- tutor routes -----------------------------------------------------------

func (h *PracticeExamHandler) TutorCreate(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var in service.CreateExamInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteAppError(w, err)
		return
	}
	e, err := h.svc.CreateExam(r.Context(), tutorID, in)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, examToDTO(e, true), nil)
}

func (h *PracticeExamHandler) TutorList(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	exams, err := h.svc.ListTutorExams(r.Context(), tutorID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	out := make([]examDTO, len(exams))
	for i, e := range exams {
		out[i] = examToDTO(&e, false)
	}
	pkg.WriteSuccess(w, http.StatusOK, out, nil)
}

func (h *PracticeExamHandler) TutorGet(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	e, err := h.svc.GetTutorExam(r.Context(), tutorID, examID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, examToDTO(e, true), nil)
}

func (h *PracticeExamHandler) TutorUpdate(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	var in service.CreateExamInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteAppError(w, err)
		return
	}
	e, err := h.svc.UpdateExam(r.Context(), tutorID, examID, in)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, examToDTO(e, true), nil)
}

func (h *PracticeExamHandler) TutorDelete(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	if err := h.svc.DeleteExam(r.Context(), tutorID, examID); err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true}, nil)
}

// ---- student routes ---------------------------------------------------------

func (h *PracticeExamHandler) StudentList(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	exams, err := h.svc.ListStudentExams(r.Context(), studentID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	out := make([]examDTO, len(exams))
	for i, e := range exams {
		out[i] = examToDTO(&e, false)
	}
	pkg.WriteSuccess(w, http.StatusOK, out, nil)
}

// StudentGet — the paper WITHOUT correct answers: question text + options only.
func (h *PracticeExamHandler) StudentGet(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	e, err := h.svc.GetStudentExam(r.Context(), studentID, examID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	qs := make([]playerQuestionDTO, len(e.Questions))
	for i, q := range e.Questions {
		qs[i] = playerQuestionDTO{ID: q.ID, Position: q.Position, Text: q.Text, Options: q.Options}
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"id":               e.ID,
		"subject":          e.Subject,
		"title":            e.Title,
		"description":      e.Description,
		"duration_minutes": e.DurationMinutes,
		"passing_score":    e.PassingScore,
		"question_count":   len(qs),
		"questions":        qs,
	}, nil)
}

func (h *PracticeExamHandler) StartAttempt(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	a, err := h.svc.StartAttempt(r.Context(), studentID, examID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{
		"attempt_id": a.ID,
		"started_at": a.StartedAt.UTC().Format("2006-01-02T15:04:05Z"),
		"expires_at": a.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
	}, nil)
}

func (h *PracticeExamHandler) SubmitAttempt(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	attemptID, ok := examPathID(w, r, "attemptId")
	if !ok {
		return
	}
	var req struct {
		Answers map[string]int `json:"answers"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.SubmitAttempt(r.Context(), studentID, attemptID, req.Answers)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"attempt_id":   res.AttemptID,
		"score":        res.Score,
		"passed":       res.Passed,
		"correct":      res.Correct,
		"total":        res.Total,
		"expired":      res.Expired,
		"submitted_at": res.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}, nil)
}

func (h *PracticeExamHandler) StudentAttempts(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	items, err := h.svc.ListStudentAttempts(r.Context(), studentID, 50)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, attemptItemsToDTO(items), nil)
}

func (h *PracticeExamHandler) AttemptReview(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	attemptID, ok := examPathID(w, r, "attemptId")
	if !ok {
		return
	}
	res, err := h.svc.GetAttemptReview(r.Context(), studentID, attemptID)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, reviewToDTO(res), nil)
}

// ---- tutor results ----------------------------------------------------------

func (h *PracticeExamHandler) TutorAttempts(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	examID, ok := examPathID(w, r, "id")
	if !ok {
		return
	}
	items, err := h.svc.ListExamAttempts(r.Context(), tutorID, examID, 50)
	if err != nil {
		writeExamError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, attemptItemsToDTO(items), nil)
}

func attemptItemsToDTO(items []service.AttemptListItem) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		row := map[string]any{
			"attempt_id":   it.AttemptID,
			"exam_id":      it.ExamID,
			"exam_title":   it.ExamTitle,
			"exam_subject": it.ExamSubject,
			"score":        it.Score,
			"passed":       it.Passed,
			"total":        it.Total,
			"started_at":   it.StartedAt.UTC().Format("2006-01-02T15:04:05Z"),
			"expires_at":   it.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		}
		if it.SubmittedAt != nil {
			row["submitted_at"] = it.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z")
		}
		out = append(out, row)
	}
	return out
}

func reviewToDTO(res *service.AttemptResult) map[string]any {
	qs := make([]map[string]any, len(res.Questions))
	for i, q := range res.Questions {
		qs[i] = map[string]any{
			"id":            q.ID,
			"position":      q.Position,
			"text":          q.Text,
			"options":       q.Options,
			"chosen_index":  q.ChosenIndex,
			"correct_index": q.CorrectIndex,
			"explanation":   q.Explanation,
		}
	}
	return map[string]any{
		"attempt_id":    res.AttemptID,
		"exam_id":       res.ExamID,
		"exam_title":    res.ExamTitle,
		"exam_subject":  res.ExamSubject,
		"passing_score": res.Passing,
		"score":         res.Score,
		"passed":        res.Passed,
		"correct":       res.Correct,
		"total":         res.Total,
		"expired":       res.Expired,
		"submitted_at":  res.SubmittedAt.UTC().Format("2006-01-02T15:04:05Z"),
		"questions":     qs,
	}
}
