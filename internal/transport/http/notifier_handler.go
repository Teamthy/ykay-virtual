package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// NotifierHandler — admin-triggered outbound notifications (WhatsApp, etc.).
type NotifierHandler struct {
	svc *service.NotifierService
}

func NewNotifierHandler(svc *service.NotifierService) *NotifierHandler {
	return &NotifierHandler{svc: svc}
}

// SendWhatsApp — POST /api/v1/admin/notifications/whatsapp (admin). Sends a
// WhatsApp message to a user (by user_id) or an explicit phone number.
func (h *NotifierHandler) SendWhatsApp(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	var req struct {
		UserID string `json:"user_id"`
		Phone  string `json:"phone"`
		Body   string `json:"body"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.Body == "" {
		WriteAppError(w, pkg.BadRequest("body is required", nil))
		return
	}
	if req.Phone != "" {
		if err := h.svc.SendWhatsAppTo(r.Context(), req.Phone, req.Body); err != nil {
			WriteAppError(w, err)
			return
		}
		pkg.WriteSuccess(w, http.StatusAccepted, map[string]any{"queued": true, "channel": "whatsapp", "to": req.Phone}, nil)
		return
	}
	uid, err := uuid.Parse(req.UserID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("user_id must be a valid UUID (or provide phone)", nil))
		return
	}
	if err := h.svc.SendWhatsApp(r.Context(), uid, req.Body); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusAccepted, map[string]any{"queued": true, "channel": "whatsapp", "user_id": uid}, nil)
}
