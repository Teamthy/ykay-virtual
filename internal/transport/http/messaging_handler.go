package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// MessagingHandler — booking-scoped conversations + notifications:
//   - GET  /api/v1/me/conversations
//   - POST /api/v1/me/conversations                {type: BOOKING|COHORT, package_id|cohort_id, participant_user_ids[]}
//   - GET  /api/v1/me/conversations/{id}/messages?before=&limit=
//   - POST /api/v1/me/conversations/{id}/messages  {body}
//   - POST /api/v1/me/conversations/{id}/read
//   - GET  /api/v1/me/notifications
//   - GET  /api/v1/me/notifications/unread-count
//   - POST /api/v1/me/notifications/{id}/read
//   - POST /api/v1/me/notifications/read-all

type MessagingHandler struct {
	svc *service.MessagingService
}

func NewMessagingHandler(svc *service.MessagingService) *MessagingHandler {
	return &MessagingHandler{svc: svc}
}

func (h *MessagingHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	p := ParsePagination(r)
	convs, total, err := h.svc.ListConversations(r.Context(), actor.UserID, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, convs, p.Meta(total))
}

func (h *MessagingHandler) CreateConversation(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		Type               string   `json:"type"` // BOOKING | COHORT
		PackageID          string   `json:"package_id"`
		CohortID           string   `json:"cohort_id"`
		ParticipantUserIDs []string `json:"participant_user_ids"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var userIDs []uuid.UUID
	for _, s := range req.ParticipantUserIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("participant_user_ids must be UUIDs", nil))
			return
		}
		userIDs = append(userIDs, id)
	}

	var conv interface{}
	var err error
	switch req.Type {
	case "BOOKING":
		packageID, perr := uuid.Parse(req.PackageID)
		if perr != nil {
			WriteAppError(w, pkg.BadRequest("package_id must be a valid UUID", nil))
			return
		}
		conv, err = h.svc.CreateBookingConversation(r.Context(), packageID, userIDs, actor.UserID)
	case "COHORT":
		cohortID, perr := uuid.Parse(req.CohortID)
		if perr != nil {
			WriteAppError(w, pkg.BadRequest("cohort_id must be a valid UUID", nil))
			return
		}
		conv, err = h.svc.CreateCohortConversation(r.Context(), cohortID, userIDs, actor.UserID)
	default:
		WriteAppError(w, pkg.BadRequest("type must be BOOKING or COHORT", nil))
		return
	}
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, conv, nil)
}

func (h *MessagingHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	convID, err := ParseUUID(r, "conversationId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var before *uuid.UUID
	if b := r.URL.Query().Get("before"); b != "" {
		if id, perr := uuid.Parse(b); perr == nil {
			before = &id
		}
	}
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n := parseIntDefault(l, 50); n > 0 && n <= 100 {
			limit = n
		}
	}
	msgs, err := h.svc.ListMessages(r.Context(), actor.UserID, convID, before, limit)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, msgs, nil)
}

func (h *MessagingHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	convID, err := ParseUUID(r, "conversationId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Type string `json:"type"`
		Body string `json:"body"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	msgType := messaging.MessageType(req.Type)
	if msgType == "" {
		msgType = messaging.MsgText
	}
	msg, err := h.svc.SendMessage(r.Context(), service.SendMessageInput{
		ConversationID: convID,
		SenderUserID:   actor.UserID,
		Type:           msgType,
		Body:           req.Body,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, msg, nil)
}

func (h *MessagingHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	convID, err := ParseUUID(r, "conversationId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.MarkConversationRead(r.Context(), actor.UserID, convID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"read": true}, nil)
}

// --- Notifications ---

func (h *MessagingHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	p := ParsePagination(r)
	notifs, total, err := h.svc.ListNotifications(r.Context(), actor.UserID, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, notifs, p.Meta(total))
}

func (h *MessagingHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	n, err := h.svc.UnreadCount(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"unread": n}, nil)
}

func (h *MessagingHandler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	notifID, err := ParseUUID(r, "notificationId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.MarkNotificationRead(r.Context(), actor.UserID, notifID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"read": true}, nil)
}

func (h *MessagingHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if err := h.svc.MarkAllNotificationsRead(r.Context(), actor.UserID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"read_all": true}, nil)
}
