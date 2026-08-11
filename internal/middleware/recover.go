package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"ykay-virtual/pkg"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recovered: %v\n%s", rec, debug.Stack())
				pkg.WriteError(w, http.StatusInternalServerError, string(pkg.CodeInternal), "internal server error", nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
