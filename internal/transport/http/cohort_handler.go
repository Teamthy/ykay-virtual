package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// CohortHandler — GET /api/v1/cohorts/{id} (public checkout surface).

type CohortHandler struct{ svc *service.CohortService }

func NewCohortHandler(svc *service.CohortService) *CohortHandler { return &CohortHandler{svc: svc} }

func (h *CohortHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	cohort, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, cohort, nil)
}
