package notification

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTermiiSendBuildsCorrectRequest(t *testing.T) {
	var got termiiSMSRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/sms/send" {
			t.Errorf("path = %s", r.URL.Path)
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = w.Write([]byte(`{"message_id":"msg_123","status":"Success"}`))
	}))
	defer srv.Close()

	s := NewTermiiSMSSender("key-123", "YK-Virtual", "")
	s.BaseURL = srv.URL
	if err := s.Send(context.Background(), "+2348012345678", "Your lesson starts at 4pm."); err != nil {
		t.Fatalf("send: %v", err)
	}
	if got.To != "2348012345678" {
		t.Errorf("to = %q, want country-code format without +", got.To)
	}
	if got.From != "YK-Virtual" || got.APIKey != "key-123" || got.Channel != "dnd" || got.Type != "plain" {
		t.Errorf("request fields wrong: %+v", got)
	}
	if got.SMS != "Your lesson starts at 4pm." {
		t.Errorf("sms body mismatch")
	}
}

func TestTermiiRejectsGatewayError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"message":"Insufficient balance"}`))
	}))
	defer srv.Close()

	s := NewTermiiSMSSender("key", "YK-Virtual", "")
	s.BaseURL = srv.URL
	err := s.Send(context.Background(), "2348012345678", "hello")
	if err == nil || !strings.Contains(err.Error(), "rejected") {
		t.Fatalf("expected rejection error, got %v", err)
	}
}

func TestTermiiHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"message":"Invalid API Key"}`))
	}))
	defer srv.Close()

	s := NewTermiiSMSSender("bad", "YK-Virtual", "")
	s.BaseURL = srv.URL
	if err := s.Send(context.Background(), "2348012345678", "hello"); err == nil {
		t.Fatal("expected error for 401")
	}
}

func TestConsoleSMSNeverFails(t *testing.T) {
	if err := (ConsoleSMSSender{}).Send(context.Background(), "2348012345678", "hi"); err != nil {
		t.Fatalf("console sender must never fail: %v", err)
	}
}
