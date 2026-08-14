package httpapi

import (
	"net/http"
	"strconv"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// PortalHandler — the portal surfaces:
//   - GET  /me/availability?tutor_profile_id=            (tutor)
//   - POST /me/availability                              (tutor)
//   - DELETE /me/availability/{id}?tutor_profile_id=     (tutor)
//   - GET  /me/availability-exceptions?tutor_profile_id=
//   - POST /me/availability-exceptions
//   - DELETE /me/availability-exceptions/{id}
//   - GET  /me/assignments?student_profile_id=           (student)
//   - POST /me/assignments/{assignmentId}/submit         (student)
//   - GET  /me/submissions?student_profile_id=
//   - GET  /me/attendance-summary?student_profile_id=
//   - GET  /me/orders/{orderId}                          (parent receipt)

type PortalHandler struct {
	svc   *service.PortalService
	authz *ProfileAuthorizer
}

func NewPortalHandler(svc *service.PortalService, authz *ProfileAuthorizer) *PortalHandler {
	return &PortalHandler{svc: svc, authz: authz}
}

// resolveTutor / resolveStudent — G1: every profile-scoped portal endpoint
// resolves the acting profile through the session; browser-supplied IDs are
// only honoured when they belong to the caller (or the caller is an admin).
func (h *PortalHandler) resolveTutor(w http.ResponseWriter, r *http.Request, raw string) (uuid.UUID, bool) {
	actor := requireActor(w, r)
	if actor == nil {
		return uuid.Nil, false
	}
	id, err := h.authz.ResolveTutor(r.Context(), actor, raw)
	if err != nil {
		WriteAppError(w, err)
		return uuid.Nil, false
	}
	return id, true
}

func (h *PortalHandler) resolveStudent(w http.ResponseWriter, r *http.Request, raw string) (uuid.UUID, bool) {
	actor := requireActor(w, r)
	if actor == nil {
		return uuid.Nil, false
	}
	id, err := h.authz.ResolveStudent(r.Context(), actor, raw)
	if err != nil {
		WriteAppError(w, err)
		return uuid.Nil, false
	}
	return id, true
}

func (h *PortalHandler) ListAvailability(w http.ResponseWriter, r *http.Request) {
	tutorID, ok := h.resolveTutor(w, r, r.URL.Query().Get("tutor_profile_id"))
	if !ok {
		return
	}
	list, err := h.svc.ListAvailability(r.Context(), tutorID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *PortalHandler) UpsertAvailability(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TutorProfileID string `json:"tutor_profile_id"`
		DayOfWeek      int    `json:"day_of_week"`
		StartTime      string `json:"start_time"`
		EndTime        string `json:"end_time"`
		IsRecurring    bool   `json:"is_recurring"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, ok := h.resolveTutor(w, r, req.TutorProfileID)
	if !ok {
		return
	}
	a, err := h.svc.UpsertAvailability(r.Context(), service.AvailabilityInput{
		TutorProfileID: tutorID, DayOfWeek: req.DayOfWeek,
		StartTime: req.StartTime, EndTime: req.EndTime, IsRecurring: req.IsRecurring,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, a, nil)
}

func (h *PortalHandler) DeleteAvailability(w http.ResponseWriter, r *http.Request) {
	tutorID, ok := h.resolveTutor(w, r, r.URL.Query().Get("tutor_profile_id"))
	if !ok {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.DeleteAvailability(r.Context(), tutorID, id); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true}, nil)
}

func (h *PortalHandler) ListExceptions(w http.ResponseWriter, r *http.Request) {
	tutorID, ok := h.resolveTutor(w, r, r.URL.Query().Get("tutor_profile_id"))
	if !ok {
		return
	}
	list, err := h.svc.ListAvailabilityExceptions(r.Context(), tutorID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *PortalHandler) UpsertException(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TutorProfileID string  `json:"tutor_profile_id"`
		ExceptionDate  string  `json:"exception_date"`
		IsAvailable    bool    `json:"is_available"`
		StartTime      *string `json:"start_time"`
		EndTime        *string `json:"end_time"`
		Reason         *string `json:"reason"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, ok := h.resolveTutor(w, r, req.TutorProfileID)
	if !ok {
		return
	}
	e, err := h.svc.UpsertAvailabilityException(r.Context(), service.ExceptionInput{
		TutorProfileID: tutorID, ExceptionDate: req.ExceptionDate, IsAvailable: req.IsAvailable,
		StartTime: req.StartTime, EndTime: req.EndTime, Reason: req.Reason,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, e, nil)
}

func (h *PortalHandler) DeleteException(w http.ResponseWriter, r *http.Request) {
	tutorID, ok := h.resolveTutor(w, r, r.URL.Query().Get("tutor_profile_id"))
	if !ok {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.DeleteAvailabilityException(r.Context(), tutorID, id); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true}, nil)
}

// --- Student ---

func (h *PortalHandler) MyAssignments(w http.ResponseWriter, r *http.Request) {
	studentID, ok := h.resolveStudent(w, r, r.URL.Query().Get("student_profile_id"))
	if !ok {
		return
	}
	list, err := h.svc.AssignmentsForStudent(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *PortalHandler) SubmitAssignment(w http.ResponseWriter, r *http.Request) {
	studentID, ok := h.resolveStudent(w, r, r.URL.Query().Get("student_profile_id"))
	if !ok {
		return
	}
	assignmentID, err := ParseUUID(r, "assignmentId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Content *string `json:"content"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	sub, err := h.svc.SubmitAssignment(r.Context(), studentID, assignmentID, req.Content, nil)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, sub, nil)
}

func (h *PortalHandler) MySubmissions(w http.ResponseWriter, r *http.Request) {
	studentID, ok := h.resolveStudent(w, r, r.URL.Query().Get("student_profile_id"))
	if !ok {
		return
	}
	list, err := h.svc.ListMySubmissions(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

func (h *PortalHandler) AttendanceSummary(w http.ResponseWriter, r *http.Request) {
	studentID, ok := h.resolveStudent(w, r, r.URL.Query().Get("student_profile_id"))
	if !ok {
		return
	}
	summary, err := h.svc.AttendanceSummary(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, summary, nil)
}

// --- Parent receipt ---

func (h *PortalHandler) OrderReceipt(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	orderID, err := ParseUUID(r, "orderId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	receipt, err := h.svc.GetOrderReceipt(r.Context(), actor.UserID, orderID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, receipt, nil)
}

var _ = strconv.Itoa
var _ = booking.Lesson{}
