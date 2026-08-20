package httpapi

import (
	"errors"
	"net/http"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/pkg"
)

// SessionContextHandler exposes only the profile identifiers the authenticated
// actor is allowed to use. Clients must resolve IDs here rather than embedding
// fixture UUIDs or trusting browser-supplied actor IDs.
type SessionContextHandler struct {
	students identity.StudentProfileRepository
	vetting  vetting.VettingRepository
}

func NewSessionContextHandler(students identity.StudentProfileRepository, vettingRepo vetting.VettingRepository) *SessionContextHandler {
	return &SessionContextHandler{students: students, vetting: vettingRepo}
}

type sessionLearner struct {
	ID           string  `json:"id"`
	FirstName    string  `json:"first_name"`
	LastName     string  `json:"last_name"`
	Timezone     string  `json:"timezone"`
	CurrentLevel *string `json:"current_level,omitempty"`
}

type sessionTutor struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func (h *SessionContextHandler) Get(w http.ResponseWriter, r *http.Request) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "not authenticated", nil)
		return
	}

	out := struct {
		UserID       string           `json:"user_id"`
		Roles        []string         `json:"roles"`
		Learners     []sessionLearner `json:"learners"`
		Student      *sessionLearner  `json:"student,omitempty"`
		TutorProfile *sessionTutor    `json:"tutor_profile,omitempty"`
	}{UserID: actor.UserID.String(), Roles: actor.Roles, Learners: []sessionLearner{}}

	// Parents receive only explicit parent_student_links. A student account
	// receives only the profile whose user_id equals its authenticated ID.
	if hasSessionRole(actor.Roles, "PARENT") {
		learners, err := h.students.ListByParentUserID(r.Context(), actor.UserID)
		if err != nil {
			WriteAppError(w, err)
			return
		}
		for _, learner := range learners {
			out.Learners = append(out.Learners, sessionLearner{ID: learner.ID.String(), FirstName: learner.FirstName, LastName: learner.LastName, Timezone: learner.Timezone})
		}
	}
	if hasSessionRole(actor.Roles, "STUDENT") {
		student, err := h.students.FindByUserID(r.Context(), actor.UserID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			WriteAppError(w, err)
			return
		}
		if student != nil {
			out.Student = &sessionLearner{ID: student.ID.String(), FirstName: student.FirstName, LastName: student.LastName, Timezone: student.Timezone, CurrentLevel: student.CurrentLevel}
		}
	}
	if hasSessionRole(actor.Roles, "TUTOR") {
		profile, err := h.vetting.GetProfileByUserID(r.Context(), actor.UserID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			WriteAppError(w, err)
			return
		}
		if profile != nil {
			out.TutorProfile = &sessionTutor{ID: profile.ID.String(), Status: string(profile.Status)}
		}
	}
	pkg.WriteSuccess(w, http.StatusOK, out, nil)
}

func hasSessionRole(roles []string, expected string) bool {
	for _, role := range roles {
		if role == expected {
			return true
		}
	}
	return false
}
