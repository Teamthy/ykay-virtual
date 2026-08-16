package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"ykay-virtual/pkg"
)

// Recover converts any panic into a structured error log (with stack) and a
// 500 envelope — the request never crashes the process (A-20).
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				reqID, _ := r.Context().Value(RequestIDKey).(string)
				slog.Error("panic recovered",
					"panic", fmt.Sprint(rec),
					"request_id", reqID,
					"path", r.URL.Path,
					"method", r.Method,
					"stack", string(debug.Stack()),
				)
				pkg.WriteError(w, http.StatusInternalServerError, string(pkg.CodeInternal), "internal server error", nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
