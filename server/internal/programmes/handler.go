package programmes

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
	onlyPublished := r.URL.Query().Get("public") == "true"
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.service.List(onlyPublished))
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		id = strings.TrimPrefix(r.URL.Path, "/api/v1/programmes/")
		id = strings.TrimSuffix(id, "/")
	}
	programme, err := h.service.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(programme)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	prog, err := h.service.Create(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(prog)
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		id = strings.TrimPrefix(r.URL.Path, "/api/v1/programmes/")
		id = strings.TrimSuffix(id, "/status")
	}
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	actorRole := r.Header.Get("X-Actor-Role")
	if actorRole == "" {
		actorRole = "ACADEMIC_ADMIN" // fallback for demo if header not provided
	}

	prog, err := h.service.UpdateStatus(r.Context(), id, req.Status, actorRole)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(prog)
}
