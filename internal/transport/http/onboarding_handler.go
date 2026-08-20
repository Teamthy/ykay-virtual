package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// OnboardingHandler — stateful onboarding steps:
//   - POST /api/v1/me/learners   (parent adds a linked learner)
//   - GET  /api/v1/me/learners   (the parent's learners)

type OnboardingHandler struct {
	svc *service.OnboardingService
}

func NewOnboardingHandler(svc *service.OnboardingService) *OnboardingHandler {
	return &OnboardingHandler{svc: svc}
}

func (h *OnboardingHandler) CreateLearner(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		FirstName    string  `json:"first_name"`
		LastName     string  `json:"last_name"`
		DateOfBirth  *string `json:"date_of_birth"`
		SchoolName   *string `json:"school_name"`
		CurrentLevel *string `json:"current_level"`
		Relationship string  `json:"relationship"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var dob *time.Time
	if req.DateOfBirth != nil && *req.DateOfBirth != "" {
		t, err := time.Parse("2006-01-02", *req.DateOfBirth)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("date_of_birth must be YYYY-MM-DD", nil))
			return
		}
		dob = &t
	}
	learner, err := h.svc.CreateLearner(r.Context(), service.CreateLearnerInput{
		ParentUserID: actor.UserID,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		DateOfBirth:  dob,
		SchoolName:   req.SchoolName,
		CurrentLevel: req.CurrentLevel,
		Relationship: req.Relationship,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, learner, nil)
}

func (h *OnboardingHandler) EnsureOwnProfile(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		FirstName    string  `json:"first_name"`
		LastName     string  `json:"last_name"`
		CurrentLevel *string `json:"current_level"`
	}
	_ = DecodeJSON(r, &req)
	p, err := h.svc.EnsureOwnProfile(r.Context(), actor.UserID, req.FirstName, req.LastName, req.CurrentLevel)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

func (h *OnboardingHandler) ListLearners(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	learners, err := h.svc.ListLearners(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, learners, nil)
}
