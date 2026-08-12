package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SessionAuth — resolves the actor from the httpOnly session cookie OR a
// mobile bearer token (`Authorization: Bearer <raw>`):
//   1. Reads the raw token from the `ykay_session` cookie or the header
//   2. Hashes it (SHA-256) and looks the session up via the AuthService
//   3. Puts the actor (user id + roles) in the request context
// There is no fallback bridge: without a valid session no actor is
// established and protected handlers return 401 (hardening SEC-001).
// Bearer tokens are the same hashed sessions issued by the mobile login
// endpoints (phase 35 / M4) — stored on-device via SecureStore.

type SessionResolver interface {
	Me(ctx context.Context, tokenHash string) (userID uuid.UUID, roles []string, err error)
}

// BearerToken — raw token from `Authorization: Bearer …` (mobile clients).
func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

func SessionAuth(resolver SessionResolver, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := ""
			if cookie, err := r.Cookie(cookieName); err == nil {
				raw = cookie.Value
			}
			if raw == "" {
				raw = BearerToken(r)
			}
			if raw != "" {
				hash := hashToken(raw)
				userID, roles, err := resolver.Me(r.Context(), hash)
				if err == nil {
					actor := Actor{UserID: userID, Roles: roles}
					for _, role := range roles {
						if role == "ACADEMIC_ADMIN" || role == "SUPER_ADMIN" || role == "INSTITUTION_ADMIN" {
							actor.IsAdmin = true
						}
					}
					ctx := context.WithValue(r.Context(), ActorKey, actor)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				// Invalid/expired/revoked session → clear the cookie.
				http.SetCookie(w, &http.Cookie{
					Name:     cookieName,
					Value:    "",
					Path:     "/",
					MaxAge:   -1,
					HttpOnly: true,
					SameSite: http.SameSiteLaxMode,
				})
			}
			next.ServeHTTP(w, r)
		})
	}
}

func hashToken(raw string) string {
	sum := sha256Sum([]byte(raw))
	return hexEncode(sum)
}

// Cookie helpers shared with the auth handler.

type CookieConfig struct {
	Name   string
	Secure bool
	Domain string
	MaxAge int
	Path   string
}

func DefaultCookieConfig(secure bool) CookieConfig {
	return CookieConfig{Name: "ykay_session", Secure: secure, MaxAge: int((30 * 24 * time.Hour).Seconds()), Path: "/"}
}

func SetSessionCookie(w http.ResponseWriter, cfg CookieConfig, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.Name,
		Value:    token,
		Path:     cfg.Path,
		MaxAge:   cfg.MaxAge,
		HttpOnly: true,
		Secure:   cfg.Secure,
		SameSite: http.SameSiteLaxMode,
		Domain:   strings.TrimPrefix(cfg.Domain, "https://"),
	})
}

func ClearSessionCookie(w http.ResponseWriter, cfg CookieConfig) {
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.Name,
		Value:    "",
		Path:     cfg.Path,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.Secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func sha256Sum(b []byte) []byte {
	sum := sha256.Sum256(b)
	return sum[:]
}

func hexEncode(b []byte) string { return hex.EncodeToString(b) }
