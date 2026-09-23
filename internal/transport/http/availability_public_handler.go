package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/pkg"
)

// AvailabilityPublicHandler — tutor availability matching (feature 4).
// GET /api/v1/tutors/{id}/availability returns a tutor's REAL recurring slots
// from tutor_availabilities (000004 + 000077 active flag) so booking flows show
// only genuine availability for the matched tutor. No fabricated slots.
type AvailabilityPublicHandler struct {
	repo tutor.AvailabilityRepository
}

func NewAvailabilityPublicHandler(repo tutor.AvailabilityRepository) *AvailabilityPublicHandler {
	return &AvailabilityPublicHandler{repo: repo}
}

// ByTutor — GET /api/v1/tutors/{id}/availability. {id} is the tutor profile id.
func (h *AvailabilityPublicHandler) ByTutor(w http.ResponseWriter, r *http.Request) {
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	slots, err := h.repo.ListByTutor(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, slots, nil)
}
