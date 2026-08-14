package httpapi

import (
	"net/http"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// SupportHandler — public + authenticated support tickets:
//   - POST /api/v1/support/tickets  {email, subject, message}

type SupportHandler struct {
	svc *service.SupportService
}

func NewSupportHandler(svc *service.SupportService) *SupportHandler {
	return &SupportHandler{svc: svc}
}

func (h *SupportHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Subject  string `json:"subject"`
		Message  string `json:"message"`
		Category string `json:"category,omitempty"` // GENERAL | SAFEGUARDING | FINANCE | ACADEMIC
		Severity string `json:"severity,omitempty"` // LOW | MEDIUM | HIGH | URGENT
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var userID *uuid.UUID
	if actor, ok := middleware.ActorFromContext(r.Context()); ok && actor.UserID != uuid.Nil {
		userID = &actor.UserID
	}
	ticket, err := h.svc.OpenTicketWithMeta(r.Context(), userID, req.Email, req.Subject, req.Message, req.Category, req.Severity)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, ticket, nil)
}
