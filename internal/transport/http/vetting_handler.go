package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// VettingHandler — tutor-facing vetting endpoints:
//   - POST   /api/v1/tutors/me/vetting/profile        create draft profile
//   - GET    /api/v1/tutors/me/vetting/profile        my profile
//   - POST   /api/v1/tutors/me/vetting/subjects       add teaching subject
//   - GET    /api/v1/tutors/me/vetting/subjects       list my subjects
//   - POST   /api/v1/tutors/me/vetting/submit         DRAFT → SUBMITTED
//   - POST   /api/v1/tutors/me/vetting/documents      request signed upload URL
//   - GET    /api/v1/tutors/me/vetting/documents/{id} signed view URL (owner)
//   - POST   /api/v1/tutors/me/vetting/assessments           start quiz
//   - POST   /api/v1/tutors/me/vetting/assessments/{id}/submit

type VettingHandler struct {
	svc *service.VettingService
}

func NewVettingHandler(svc *service.VettingService) *VettingHandler { return &VettingHandler{svc: svc} }

func (h *VettingHandler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		DisplayName     string   `json:"display_name"`
		Headline        *string  `json:"headline"`
		Bio             *string  `json:"bio"`
		YearsExperience int      `json:"years_experience"`
		HourlyRateMin   *float64 `json:"hourly_rate_min"`
		HourlyRateMax   *float64 `json:"hourly_rate_max"`
		Currency        string   `json:"currency"`
		Timezone        string   `json:"timezone"`
		AcceptsOnline   bool     `json:"accepts_online"`
		AcceptsInPerson bool     `json:"accepts_in_person"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	profile, err := h.svc.CreateProfile(r.Context(), actor.UserID, service.CreateProfileInput{
		DisplayName:     req.DisplayName,
		Headline:        req.Headline,
		Bio:             req.Bio,
		YearsExperience: req.YearsExperience,
		HourlyRateMin:   req.HourlyRateMin,
		HourlyRateMax:   req.HourlyRateMax,
		Currency:        req.Currency,
		Timezone:        req.Timezone,
		AcceptsOnline:   req.AcceptsOnline,
		AcceptsInPerson: req.AcceptsInPerson,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, profile, nil)
}

func (h *VettingHandler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profile, err := h.svc.GetMyProfile(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, profile, nil)
}

func (h *VettingHandler) AddSubject(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	var req struct {
		SubjectID string `json:"subject_id"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("subject_id must be a valid UUID", nil))
		return
	}
	if err := h.svc.AddSubject(r.Context(), actor.UserID, profileID, subjectID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{"added": true}, nil)
}

func (h *VettingHandler) ListMySubjects(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	subjects, err := h.svc.ListMySubjects(r.Context(), actor.UserID, profileID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, subjects, nil)
}

func (h *VettingHandler) Submit(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	if err := h.svc.SubmitForReview(r.Context(), actor.UserID, profileID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"submitted": true, "status": "SUBMITTED"}, nil)
}

func (h *VettingHandler) RequestDocumentUpload(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	var req struct {
		Type     string `json:"type"`
		FileName string `json:"file_name"`
		MimeType string `json:"mime_type"`
		FileSize *int   `json:"file_size"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.RequestDocumentUpload(r.Context(), actor.UserID, profileID,
		vetting.DocumentType(req.Type), req.FileName, req.MimeType, req.FileSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, res, nil)
}

func (h *VettingHandler) GetDocumentURL(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	docID, err := uuid.Parse(r.PathValue("documentId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("document_id must be a valid UUID", nil))
		return
	}
	url, err := h.svc.GetDocumentSignedURL(r.Context(), actor.UserID, docID, actor.IsAdmin)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"signed_url": url}, nil)
}

func (h *VettingHandler) StartAssessment(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	var req struct {
		SubjectID string `json:"subject_id"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("subject_id must be a valid UUID", nil))
		return
	}
	attempt, err := h.svc.StartAssessment(r.Context(), actor.UserID, profileID, subjectID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, attempt, nil)
}

func (h *VettingHandler) SubmitAssessment(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	attemptID, err := uuid.Parse(r.PathValue("attemptId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("attempt_id must be a valid UUID", nil))
		return
	}
	var req struct {
		Answers []service.AssessmentAnswerInput `json:"answers"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	res, err := h.svc.SubmitAssessment(r.Context(), actor.UserID, attemptID, req.Answers)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}
