package pkg

import (
	"encoding/json"
	"net/http"
)

// Envelope success: {"data":..., "meta":...}
// Error envelope: {"error":{"code","message","details"}}

type SuccessEnvelope struct {
	Data interface{}     `json:"data"`
	Meta *PaginationMeta `json:"meta,omitempty"`
}

type ErrorDetail struct {
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

type ErrorEnvelope struct {
	Error struct {
		Code    string        `json:"code"`
		Message string        `json:"message"`
		Details []ErrorDetail `json:"details,omitempty"`
	} `json:"error"`
}

func WriteJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func WriteSuccess(w http.ResponseWriter, status int, data interface{}, meta *PaginationMeta) {
	WriteJSON(w, status, SuccessEnvelope{Data: data, Meta: meta})
}

func WriteError(w http.ResponseWriter, status int, code, message string, details []ErrorDetail) {
	env := ErrorEnvelope{}
	env.Error.Code = code
	env.Error.Message = message
	env.Error.Details = details
	WriteJSON(w, status, env)
}
