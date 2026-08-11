package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// DashboardHandler — portal read endpoints:
//   - GET /api/v1/me/orders            (parent's orders)
//   - GET /api/v1/me/lessons           (student's lessons via student_profile_id)
//   - GET /api/v1/me/earnings          (tutor's escrow + payouts)
//   - GET /api/v1/me/tutor-lessons     (tutor's lessons via tutor_profile_id)

type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func (h *DashboardHandler) MyOrders(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	p := ParsePagination(r)
	orders, total, err := h.svc.ParentOrders(r.Context(), actor.UserID, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, orders, p.Meta(total))
}

func (h *DashboardHandler) MyLessons(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := uuid.Parse(r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("student_profile_id query param is required", nil))
		return
	}
	lessons, err := h.svc.StudentLessons(r.Context(), studentID, 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
}

func (h *DashboardHandler) MyTutorLessons(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := uuid.Parse(r.URL.Query().Get("tutor_profile_id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id query param is required", nil))
		return
	}
	lessons, err := h.svc.TutorLessons(r.Context(), tutorID, 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lessons, nil)
}

func (h *DashboardHandler) MyEarnings(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	tutorID, err := uuid.Parse(r.URL.Query().Get("tutor_profile_id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id query param is required", nil))
		return
	}
	earnings, err := h.svc.TutorEarnings(r.Context(), tutorID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, earnings, nil)
}
