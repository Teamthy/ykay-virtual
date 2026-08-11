package lessons

import (
	"encoding/json"
	"net/http"
	"strings"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(h.service.List(r.Context()))
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.service.Create(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handler) MarkAttendance(w http.ResponseWriter, r *http.Request) {
	lessonID := strings.TrimPrefix(r.URL.Path, "/api/v1/lessons/")
	lessonID = strings.TrimSuffix(lessonID, "/attendance")
	if lessonID == "" {
		http.Error(w, "lesson id is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Status  Status `json:"status"`
		Outcome string `json:"outcome"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	actorID := r.Header.Get("X-Actor-ID")
	actorRole := r.Header.Get("X-Actor-Role")

	lesson, err := h.service.MarkAttendance(r.Context(), lessonID, req.Status, actorID, actorRole)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, err.Error(), http.StatusNotFound)
		}
		return
	}
	if req.Outcome != "" {
		lesson.Outcome = req.Outcome
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(lesson)
}

func (h *Handler) Reschedule(w http.ResponseWriter, r *http.Request) {
	lessonID := strings.TrimPrefix(r.URL.Path, "/api/v1/lessons/")
	lessonID = strings.TrimSuffix(lessonID, "/reschedule")
	if lessonID == "" {
		http.Error(w, "lesson id is required", http.StatusBadRequest)
		return
	}

	var req struct {
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
		Actor     string `json:"actor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	lesson, err := h.service.Reschedule(r.Context(), lessonID, req.StartTime, req.EndTime, req.Actor)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(lesson)
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	lessonID := strings.TrimPrefix(r.URL.Path, "/api/v1/lessons/")
	lessonID = strings.TrimSuffix(lessonID, "/cancel")
	if lessonID == "" {
		http.Error(w, "lesson id is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Reason string `json:"reason"`
		Actor  string `json:"actor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	lesson, err := h.service.Cancel(r.Context(), lessonID, req.Reason, req.Actor)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(lesson)
}
