package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// DashboardHandler — portal read endpoints:
//   - GET /api/v1/me/orders            (parent's orders)
//   - GET /api/v1/me/lessons           (student's lessons via student_profile_id)
//   - GET /api/v1/me/earnings          (tutor's escrow + payouts)
//   - GET /api/v1/me/tutor-lessons     (tutor's lessons via tutor_profile_id)

type DashboardHandler struct {
	svc   *service.DashboardService
	authz *ProfileAuthorizer
}

func NewDashboardHandler(svc *service.DashboardService, authz *ProfileAuthorizer) *DashboardHandler {
	return &DashboardHandler{svc: svc, authz: authz}
}

func (h *DashboardHandler) MyOrders(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	p := ParsePagination(r)
	orders, total, err := h.svc.ParentOrdersView(r.Context(), actor.UserID, p.Page, p.PageSize)
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
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
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
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, r.URL.Query().Get("tutor_profile_id"))
	if err != nil {
		WriteAppError(w, err)
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
	tutorID, err := h.authz.ResolveTutor(r.Context(), actor, r.URL.Query().Get("tutor_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	earnings, err := h.svc.TutorEarnings(r.Context(), tutorID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, earnings, nil)
}
