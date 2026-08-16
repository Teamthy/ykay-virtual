package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// Actor context — the authenticated actor resolved from the httpOnly session
// cookie by SessionAuth. There is deliberately NO header-based auth bridge:
// X-User-ID / X-User-Roles headers were a temporary dev seam that allowed
// complete authentication bypass; it has been REMOVED (hardening audit
// SEC-001). Sessions are the only way to become an actor.

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

// WithActor returns a context carrying an authenticated actor. Intended for
// tests and middleware that resolve a session into an actor before invoking a
// handler. The actor is read back with ActorFromContext.
func WithActor(ctx context.Context, a Actor) context.Context {
	return context.WithValue(ctx, ActorKey, a)
}

// RequireActor — helper for handlers that need an authenticated actor.
// Returns 401 when no valid session is present.
func RequireActor(w http.ResponseWriter, r *http.Request) (Actor, bool) {
	actor, ok := ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		w.Header().Set("WWW-Authenticate", "Session")
		http.Error(w, "not authenticated", http.StatusUnauthorized)
		return Actor{}, false
	}
	return actor, true
}
