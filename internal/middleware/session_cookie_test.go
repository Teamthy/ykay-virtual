package middleware

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequestIsHTTPS(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")
	assert.True(t, requestIsHTTPS(&http.Request{TLS: &tls.ConnectionState{}}), "TLS => https")
	assert.True(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"https"}}}))
	assert.True(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"HTTPS"}}}))
	assert.False(t, requestIsHTTPS(&http.Request{}), "no TLS, no XFP => http")
	assert.False(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"http"}}}))
	assert.False(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{""}}}))
	t.Setenv("TRUST_PROXY", "")
	assert.False(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"https"}}}), "untrusted XFP must be ignored")
}

// A-28: in production over plain HTTP (e.g. a locally-run API behind
// http://localhost), the session cookie MUST NOT carry the Secure flag, or the
// browser drops it and every authenticated call 401s.
func TestSetSessionCookie_SecureFollowsRequest(t *testing.T) {
	cfg := CookieConfig{Name: "ykv_session", Secure: true, MaxAge: 60, Path: "/"}
	rr := httptest.NewRecorder()
	SetSessionCookie(rr, &http.Request{}, cfg, "tok")
	assert.False(t, rr.Result().Cookies()[0].Secure, "plain-HTTP request must NOT set Secure")

	t.Setenv("TRUST_PROXY", "true")
	rr2 := httptest.NewRecorder()
	SetSessionCookie(rr2, &http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"https"}}}, cfg, "tok")
	assert.True(t, rr2.Result().Cookies()[0].Secure, "https request MUST set Secure")
}

func TestCookieForRemember(t *testing.T) {
	base := DefaultCookieConfig(false)
	assert.Greater(t, base.MaxAge, 0)

	t.Run("omitted keeps persistent cookie", func(t *testing.T) {
		got := CookieForRemember(base, nil)
		assert.Equal(t, base.MaxAge, got.MaxAge)
	})
	t.Run("true keeps persistent cookie", func(t *testing.T) {
		yes := true
		got := CookieForRemember(base, &yes)
		assert.Equal(t, base.MaxAge, got.MaxAge)
	})
	t.Run("false is a session cookie", func(t *testing.T) {
		no := false
		got := CookieForRemember(base, &no)
		assert.Equal(t, 0, got.MaxAge)
		rr := httptest.NewRecorder()
		SetSessionCookie(rr, &http.Request{}, got, "tok")
		c := rr.Result().Cookies()[0]
		assert.Equal(t, 0, c.MaxAge)
		assert.True(t, c.Expires.IsZero(), "session cookie must not set Expires")
	})
}
