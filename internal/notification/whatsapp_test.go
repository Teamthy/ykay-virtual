package notification

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The Meta WhatsApp Cloud API path must not require Termii's prepaid bundle:
// with WHATSAPP_CLOUD_TOKEN + WHATSAPP_CLOUD_PHONE_ID set, messages POST to
// graph.facebook.com with the right shape; HTTP errors surface as errors.

func TestWhatsAppCloudSenderSuccess(t *testing.T) {
	var gotPath, gotAuth, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		body := make([]byte, 4096)
		n, _ := r.Body.Read(body)
		gotBody = string(body[:n])
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"messaging_product":"whatsapp","messages":[{"id":"wamid.test"}]}`))
	}))
	defer srv.Close()

	s := &WhatsAppCloudSender{Token: "tok", PhoneID: "12345", BaseURL: srv.URL, HTTP: srv.Client()}
	if err := s.Send(context.Background(), "+2348012345678", "hello nuvora"); err != nil {
		t.Fatalf("send: %v", err)
	}
	if gotPath != "/12345/messages" {
		t.Fatalf("path = %q, want /12345/messages", gotPath)
	}
	if gotAuth != "Bearer tok" {
		t.Fatalf("auth = %q, want Bearer tok", gotAuth)
	}
	if !strings.Contains(gotBody, `"to":"2348012345678"`) || !strings.Contains(gotBody, `"type":"text"`) || !strings.Contains(gotBody, "hello nuvora") {
		t.Fatalf("body = %q", gotBody)
	}
}

func TestWhatsAppCloudSenderError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"message":"Invalid token"}}`))
	}))
	defer srv.Close()

	s := &WhatsAppCloudSender{Token: "bad", PhoneID: "12345", BaseURL: srv.URL, HTTP: srv.Client()}
	err := s.Send(context.Background(), "2348012345678", "hi")
	if err == nil || !strings.Contains(err.Error(), "HTTP 401") {
		t.Fatalf("expected HTTP 401 error, got %v", err)
	}
}
