package httpapi

import (
	"net/http"
	"testing"
)

func TestWebGoogleRedirectPrefersForwardedOrigin(t *testing.T) {
	r := &http.Request{Header: http.Header{
		"X-Forwarded-Origin": []string{"https://ykay-virtual-wtar.vercel.app"},
	}}
	got := webGoogleRedirect(r, "https://example.onrender.com/auth/google/callback")
	want := "https://ykay-virtual-wtar.vercel.app/auth/google/callback"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestIsAppGoogleCallbackRejectsRender(t *testing.T) {
	if isAppGoogleCallback("https://ykay-virtual.onrender.com/auth/google/callback") {
		t.Fatal("render host must not be treated as the web callback")
	}
	if !isAppGoogleCallback("https://ykay-virtual-wtar.vercel.app/auth/google/callback") {
		t.Fatal("vercel app callback must be accepted")
	}
	if isAppGoogleCallback("https://ykay-virtual-wtar.vercel.app/login") {
		t.Fatal("non-callback path must be rejected")
	}
}
