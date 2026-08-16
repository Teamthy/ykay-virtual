package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// Unwrap keeps http.ResponseController (and http.Flusher/Hijacker passthrough)
// working through this wrapper.
func (rw *responseWriter) Unwrap() http.ResponseWriter { return rw.ResponseWriter }

// Logger emits one structured access-log line per request (A-20). Fields are
// stable keys so logs can be aggregated/searched: method, path, status,
// duration_ms, request_id, remote_ip, user_agent and — when authenticated —
// user_id.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		reqID, _ := r.Context().Value(RequestIDKey).(string)
		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", reqID,
			"remote_ip", clientIP(r),
			"user_agent", r.UserAgent(),
		}
		if actor, ok := ActorFromContext(r.Context()); ok && actor.UserID != uuid.Nil {
			attrs = append(attrs, "user_id", actor.UserID.String())
		}
		slog.Info("http_request", attrs...)
	})
}
