package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// WaitlistHandler — cohort waitlist (feature 6, migration 000079).
type WaitlistHandler struct {
	svc *service.WaitlistService
}

func NewWaitlistHandler(svc *service.WaitlistService) *WaitlistHandler {
	return &WaitlistHandler{svc: svc}
}

// Join — POST /api/v1/me/cohorts/{cohortId}/waitlist. Authenticated learner
// joins a full cohort's waitlist (idempotent per user).
func (h *WaitlistHandler) Join(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	entry, err := h.svc.Join(r.Context(), cohortID, actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, entry, nil)
}

// Leave — DELETE /api/v1/me/cohorts/{cohortId}/waitlist.
func (h *WaitlistHandler) Leave(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.Leave(r.Context(), cohortID, actor.UserID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]bool{"left": true}, nil)
}

// Mine — GET /api/v1/me/cohorts/{cohortId}/waitlist. My position (or null).
func (h *WaitlistHandler) Mine(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	entry, err := h.svc.Mine(r.Context(), cohortID, actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, entry, nil)
}

// PublicCount — GET /api/v1/cohorts/{id}/waitlist. Visible waitlist size from
// real data (never fabricated) so the cohort page can show seat pressure.
func (h *WaitlistHandler) PublicCount(w http.ResponseWriter, r *http.Request) {
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	count, err := h.svc.Count(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]int{"waiting": count}, nil)
}

// AdminList — GET /api/v1/admin/cohorts/{cohortId}/waitlist.
func (h *WaitlistHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	entries, err := h.svc.ListForCohort(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, entries, nil)
}

// AdminNotify — POST /api/v1/admin/cohorts/{cohortId}/waitlist/notify. Manual
// notify of the front of the waitlist (also driven by the seat-opening worker).
// Idempotent: only not-yet-notified entries are dispatched.
func (h *WaitlistHandler) AdminNotify(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	cohortID, err := ParseUUID(r, "cohortId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	notified, err := h.svc.NotifyFront(r.Context(), cohortID, 5)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	// The caller's notifier wiring (main.go) dispatches the actual message; the
	// returned entries identify exactly who was notified this call.
	ids := make([]uuid.UUID, 0, len(notified))
	for _, e := range notified {
		ids = append(ids, e.UserID)
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"notified": len(notified), "user_ids": ids}, nil)
}
