package middleware

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequestIsHTTPS(t *testing.T) {
	assert.True(t, requestIsHTTPS(&http.Request{TLS: &tls.ConnectionState{}}), "TLS => https")
	assert.True(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"https"}}}))
	assert.True(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"HTTPS"}}}))
	assert.False(t, requestIsHTTPS(&http.Request{}), "no TLS, no XFP => http")
	assert.False(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"http"}}}))
	assert.False(t, requestIsHTTPS(&http.Request{Header: http.Header{"X-Forwarded-Proto": []string{""}}}))
}

// A-28: in production over plain HTTP (e.g. a locally-run API behind
// http://localhost), the session cookie MUST NOT carry the Secure flag, or the
// browser drops it and every authenticated call 401s.
func TestSetSessionCookie_SecureFollowsRequest(t *testing.T) {
	cfg := CookieConfig{Name: "nuvora_session", Secure: true, MaxAge: 60, Path: "/"}
	rr := httptest.NewRecorder()
	SetSessionCookie(rr, &http.Request{}, cfg, "tok")
	assert.False(t, rr.Result().Cookies()[0].Secure, "plain-HTTP request must NOT set Secure")

	rr2 := httptest.NewRecorder()
	SetSessionCookie(rr2, &http.Request{Header: http.Header{"X-Forwarded-Proto": []string{"https"}}}, cfg, "tok")
	assert.True(t, rr2.Result().Cookies()[0].Secure, "https request MUST set Secure")
}
