package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// CohortHandler — GET /api/v1/cohorts (catalogue), /{id} (detail).

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

func (h *CohortHandler) List(w http.ResponseWriter, r *http.Request) {
	p := ParsePagination(r)
	params := booking.CohortListParams{Page: p.Page, PageSize: p.PageSize}
	if pid := r.URL.Query().Get("programme_id"); pid != "" {
		id, err := uuid.Parse(pid)
		if err == nil {
			params.ProgrammeID = &id
		}
	}
	cohorts, total, err := h.svc.ListPublished(r.Context(), params)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, cohorts, p.Meta(total))
}
