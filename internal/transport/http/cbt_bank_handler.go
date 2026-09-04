package httpapi

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/cbt"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// CBTBankHandler — the shared practice bank (000072):
//
//	student: GET  /cbt/subjects, GET /cbt/subjects/{slug}/paper,
//	         POST /cbt/grade
//	admin:   GET/POST /admin/cbt/questions, PATCH/DELETE /admin/cbt/questions/{id},
//	         POST /admin/cbt/import (CSV)
//
// Papers are a random published subset per request and never contain the key;
// grading is server-side only.
type CBTBankHandler struct {
	svc *service.CBTService
}

func NewCBTBankHandler(svc *service.CBTService) *CBTBankHandler {
	return &CBTBankHandler{svc: svc}
}

func writeCBTError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, cbt.ErrNotFound):
		WriteAppError(w, domain.ErrNotFound)
	case errors.Is(err, cbt.ErrDuplicateStem):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), "a question with this stem already exists in the subject", nil)
	case errors.Is(err, cbt.ErrInvalidInput), errors.Is(err, cbt.ErrNotEnough):
		WriteAppError(w, domain.ErrInvalidInput)
	default:
		WriteAppError(w, err)
	}
}

// ---- student surface --------------------------------------------------------

// ListSubjects — GET /cbt/subjects (any authenticated user).
func (h *CBTBankHandler) ListSubjects(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
	subjects, err := h.svc.ListSubjects(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, subjects, nil)
}

// Paper — GET /cbt/subjects/{slug}/paper?limit=30 — a fresh random draw.
func (h *CBTBankHandler) Paper(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
	slug := r.PathValue("slug")
	limit := 30
	if s := r.URL.Query().Get("limit"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 || n > 100 {
			pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "limit must be an integer between 1 and 100", nil)
			return
		}
		limit = n
	}
	questions, err := h.svc.GeneratePaper(r.Context(), slug, limit)
	if err != nil {
		writeCBTError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"subject":   slug,
		"limit":     limit,
		"questions": questions,
		"count":     len(questions),
	}, nil)
}

type gradeRequest struct {
	Answers []service.GradeAnswer `json:"answers"`
}

// Grade — POST /cbt/grade {answers:[{question_id, selected_index}]} —
// server-side scoring; the review reveals key + explanations.
func (h *CBTBankHandler) Grade(w http.ResponseWriter, r *http.Request) {
	if requireActor(w, r) == nil {
		return
	}
	var req gradeRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	result, err := h.svc.GradePaper(r.Context(), req.Answers)
	if err != nil {
		writeCBTError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, result, nil)
}

// ---- admin surface ----------------------------------------------------------

type adminQuestionDTO struct {
	ID           uuid.UUID `json:"id"`
	SubjectSlug  string    `json:"subject_slug"`
	Topic        string    `json:"topic"`
	Difficulty   int       `json:"difficulty"`
	Stem         string    `json:"stem"`
	Options      []string  `json:"options"`
	CorrectIndex int       `json:"correct_index"`
	Explanation  string    `json:"explanation"`
	Source       string    `json:"source"`
	Status       string    `json:"status"`
}

// ListQuestions — GET /admin/cbt/questions?subject=&page=&page_size=
func (h *CBTBankHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	page, size := cbtPageParams(r)
	questions, total, err := h.svc.ListQuestions(r.Context(), r.URL.Query().Get("subject"), page, size)
	if err != nil {
		writeCBTError(w, err)
		return
	}
	out := make([]adminQuestionDTO, len(questions))
	for i, q := range questions {
		out[i] = adminQuestionDTO{ID: q.ID, SubjectSlug: q.SubjectSlug, Topic: q.Topic, Difficulty: q.Difficulty,
			Stem: q.Stem, Options: q.Options, CorrectIndex: q.CorrectIndex,
			Explanation: q.Explanation, Source: q.Source, Status: q.Status}
	}
	meta := pkg.NewPaginationMeta(page, size, int64(total))
	pkg.WriteSuccess(w, http.StatusOK, out, &meta)
}

type createQuestionRequest struct {
	SubjectSlug  string   `json:"subject_slug"`
	SubjectName  string   `json:"subject_name"`
	ClassLevel   string   `json:"class_level"`
	Department   string   `json:"department"`
	Topic        string   `json:"topic"`
	Difficulty   int      `json:"difficulty"`
	Stem         string   `json:"stem"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
	Explanation  string   `json:"explanation"`
	Source       string   `json:"source"`
	Status       string   `json:"status"`
}

// CreateQuestion — POST /admin/cbt/questions
func (h *CBTBankHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	var req createQuestionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	for i, o := range req.Options { // normalise whitespace; reject empty option text
		req.Options[i] = strings.TrimSpace(o)
		if req.Options[i] == "" {
			writeCBTError(w, cbt.ErrInvalidInput)
			return
		}
	}
	q := cbt.Question{Topic: req.Topic, Difficulty: req.Difficulty, Stem: req.Stem,
		Options: req.Options, CorrectIndex: req.CorrectIndex, Explanation: req.Explanation,
		Source: req.Source, Status: req.Status}
	if err := h.svc.CreateQuestion(r.Context(), req.SubjectSlug, req.SubjectName, req.ClassLevel,
		req.Department, q); err != nil {
		writeCBTError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]string{"status": "created"}, nil)
}

type patchQuestionRequest struct {
	Status string `json:"status"`
}

// PatchQuestion — PATCH /admin/cbt/questions/{id} (publish/unpublish).
func (h *CBTBankHandler) PatchQuestion(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "id must be a valid UUID", nil)
		return
	}
	var req patchQuestionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetStatus(r.Context(), id, req.Status); err != nil {
		writeCBTError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]string{"status": req.Status}, nil)
}

// DeleteQuestion — DELETE /admin/cbt/questions/{id}
func (h *CBTBankHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "id must be a valid UUID", nil)
		return
	}
	if err := h.svc.DeleteQuestion(r.Context(), id); err != nil {
		writeCBTError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ImportCSV — POST /admin/cbt/import — multipart file or raw CSV body.
// Duplicate stems are skipped, so re-importing is idempotent.
func (h *CBTBankHandler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	var reader io.Reader = r.Body
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		file, _, err := r.FormFile("file")
		if err != nil {
			pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "multipart body must contain a 'file' field", nil)
			return
		}
		defer file.Close()
		reader = file
	}
	r.Body = http.MaxBytesReader(nil, r.Body, 32<<20) // 32 MiB CSV cap
	imported, skipped, err := h.svc.ImportCSV(r.Context(), reader)
	if err != nil {
		writeCBTError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]int{"imported": imported, "skipped": skipped}, nil)
}

func cbtPageParams(r *http.Request) (page, size int) {
	page, size = 1, 20
	if s := r.URL.Query().Get("page"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 10000 {
			page = n
		}
	}
	if s := r.URL.Query().Get("page_size"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 100 {
			size = n
		}
	}
	return page, size
}
