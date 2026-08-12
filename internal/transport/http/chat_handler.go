package httpapi

import (
	"net/http"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// ChatHandler — AI assistant + human handoff (phase 33). All routes require
// a session (the chat is tied to a user's thread).

type ChatHandler struct {
	svc *service.ChatService
}

func NewChatHandler(svc *service.ChatService) *ChatHandler {
	return &ChatHandler{svc: svc}
}

func (h *ChatHandler) requireUser(w http.ResponseWriter, r *http.Request) (*uuid.UUID, bool) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "authentication required", nil)
		return nil, false
	}
	return &actor.UserID, true
}

// CreateThread — POST /chat/threads {title?}
func (h *ChatHandler) CreateThread(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Title string `json:"title"`
	}
	_ = DecodeJSON(r, &req)
	t, err := h.svc.CreateThread(r.Context(), *userID, req.Title)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, t, nil)
}

// ListThreads — GET /chat/threads
func (h *ChatHandler) ListThreads(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	list, err := h.svc.ListThreads(r.Context(), *userID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// ListMessages — GET /chat/threads/{threadId}/messages
func (h *ChatHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.ListMessages(r.Context(), *userID, threadID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// SendMessage — POST /chat/threads/{threadId}/messages {content}
func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	reply, status, err := h.svc.SendMessage(r.Context(), *userID, threadID, req.Content)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"reply": reply, "status": status, "assistant": true,
	}, nil)
}

// Escalate — POST /chat/threads/{threadId}/escalate {note?}
func (h *ChatHandler) Escalate(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Note string `json:"note"`
	}
	_ = DecodeJSON(r, &req)
	if err := h.svc.EscalateToHuman(r.Context(), *userID, threadID, req.Note); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"escalated": true}, nil)
}

// ── Agent inbox (admin) ────────────────────────────────────────────────────

func (h *ChatHandler) requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "authentication required", nil)
		return false
	}
	if !actor.IsAdmin {
		pkg.WriteError(w, http.StatusForbidden, string(pkg.CodeForbidden), "admin access required", nil)
		return false
	}
	return true
}

// ListAllThreads — GET /admin/chat/threads
func (h *ChatHandler) ListAllThreads(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	list, err := h.svc.AdminListThreads(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// ListThreadMessages — GET /admin/chat/threads/{threadId}/messages
func (h *ChatHandler) ListThreadMessages(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	list, err := h.svc.AdminListMessages(r.Context(), threadID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// AgentReply — POST /admin/chat/threads/{threadId}/reply {content}
func (h *ChatHandler) AgentReply(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	msg, err := h.svc.AgentReply(r.Context(), threadID, req.Content)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, msg, nil)
}

// CloseThread — POST /admin/chat/threads/{threadId}/close
func (h *ChatHandler) CloseThread(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.CloseThread(r.Context(), threadID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"closed": true}, nil)
}

// ChatAnalytics — GET /admin/chat/analytics
func (h *ChatHandler) ChatAnalytics(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	a, err := h.svc.AdminAnalytics(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, a, nil)
}

// RateThread — POST /chat/threads/{threadId}/rating {score, comment?}
func (h *ChatHandler) RateThread(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	threadID, err := ParseUUID(r, "threadId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Score   int     `json:"score"`
		Comment *string `json:"comment"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.RateThread(r.Context(), *userID, threadID, req.Score, req.Comment); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"rated": true, "score": req.Score}, nil)
}
