package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// Dev auth bridge — reads the actor from X-User-ID / X-User-Roles headers.
// This is a TEMPORARY seam until Phase 7 replaces it with httpOnly-cookie
// sessions + middleware route guards; it lets the service layer enforce
// object-level authorization today without faking a session system.
// In production the headers are stripped by the edge and actors come from
// the session cookie.

type actorCtxKey string

const ActorKey actorCtxKey = "actor"

type Actor struct {
	UserID  uuid.UUID
	IsAdmin bool
	Roles   []string
}

func ActorFromContext(ctx context.Context) (Actor, bool) {
	a, ok := ctx.Value(ActorKey).(Actor)
	return a, ok
}

func AuthBridge(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actor := Actor{}
		if id := r.Header.Get("X-User-ID"); id != "" {
			if parsed, err := uuid.Parse(id); err == nil {
				actor.UserID = parsed
			}
		}
		for _, role := range strings.Split(r.Header.Get("X-User-Roles"), ",") {
			role = strings.TrimSpace(strings.ToUpper(role))
			if role == "" {
				continue
			}
			actor.Roles = append(actor.Roles, role)
			if role == "ADMIN" || role == "SUPER_ADMIN" {
				actor.IsAdmin = true
			}
		}
		ctx := context.WithValue(r.Context(), ActorKey, actor)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
