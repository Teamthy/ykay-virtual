package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

type hashResolver struct {
	ok map[string]uuid.UUID
}

func (h *hashResolver) Me(_ context.Context, tokenHash string) (uuid.UUID, []string, error) {
	if id, found := h.ok[tokenHash]; found {
		return id, []string{"STUDENT"}, nil
	}
	return uuid.Nil, nil, errors.New("no session")
}

func TestSessionAuthFallsBackToBearerWhenCookieInvalid(t *testing.T) {
	user := uuid.New()
	good := "good-token"
	bad := "stale-cookie"
	res := &hashResolver{ok: map[string]uuid.UUID{hashToken(good): user}}
	var sawActor bool
	h := SessionAuth(res, "ykv_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actor, ok := ActorFromContext(r.Context())
		if !ok || actor.UserID != user {
			t.Fatalf("expected actor from bearer, got ok=%v id=%v", ok, actor.UserID)
		}
		sawActor = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: "ykv_session", Value: bad})
	req.Header.Set("Authorization", "Bearer "+good)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if !sawActor {
		t.Fatal("handler was not reached with an actor")
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	for _, c := range rr.Result().Cookies() {
		if c.Name == "ykv_session" && c.MaxAge < 0 {
			t.Fatal("must not clear cookie when Bearer succeeds")
		}
	}
}

func TestSessionAuthClearsCookieWhenBothFail(t *testing.T) {
	res := &hashResolver{ok: map[string]uuid.UUID{}}
	h := SessionAuth(res, "ykv_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := ActorFromContext(r.Context()); ok {
			t.Fatal("no actor expected")
		}
		w.WriteHeader(http.StatusUnauthorized)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: "ykv_session", Value: "dead"})
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	cleared := false
	for _, c := range rr.Result().Cookies() {
		if c.Name == "ykv_session" && c.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Fatal("expected cookie clear when cookie and bearer both miss")
	}
}
