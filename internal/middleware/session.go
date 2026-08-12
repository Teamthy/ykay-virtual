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

// SessionAuth — resolves the actor from the httpOnly session cookie:
//   1. Reads the raw token from the `ykay_session` cookie
//   2. Hashes it (SHA-256) and looks the session up via the AuthService
//   3. Puts the actor (user id + roles) in the request context
// There is no fallback bridge: without a valid session cookie no actor is
// established and protected handlers return 401 (hardening SEC-001).

type SessionResolver interface {
	Me(ctx context.Context, tokenHash string) (userID uuid.UUID, roles []string, err error)
}

func SessionAuth(resolver SessionResolver, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cookieName)
			if err == nil && cookie.Value != "" {
				hash := hashToken(cookie.Value)
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
