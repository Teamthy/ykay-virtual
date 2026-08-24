package middleware

import (
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGzip_CompressesLargeJSON(t *testing.T) {
	body := `{"data":[` + strings.Repeat(`{"id":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee","title":"UTME 2026 intensive cohort"},`, 20) + `],"meta":{"page":1}}`
	srv := httptest.NewServer(Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, body)
	})))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	req.Header.Set("Accept-Encoding", "gzip")
	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.Header.Get("Content-Encoding") != "gzip" {
		t.Fatalf("expected gzip content-encoding, got %q", res.Header.Get("Content-Encoding"))
	}
	if res.Header.Get("Vary") == "" {
		t.Fatal("Vary: Accept-Encoding must be set for cache correctness")
	}
	zr, err := gzip.NewReader(res.Body)
	if err != nil {
		t.Fatalf("not a gzip stream: %v", err)
	}
	decoded, _ := io.ReadAll(zr)
	if string(decoded) != body {
		t.Fatalf("round-trip mismatch: %d vs %d bytes", len(decoded), len(body))
	}
}

func TestGzip_SkipsWhenClientDoesNotAccept(t *testing.T) {
	srv := httptest.NewServer(Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, strings.Repeat("x", 5000))
	})))
	defer srv.Close()

	res, err := srv.Client().Get(srv.URL)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.Header.Get("Content-Encoding") == "gzip" {
		t.Fatal("must not gzip when Accept-Encoding is absent")
	}
}

func TestGzip_TinyResponsesPassThroughRaw(t *testing.T) {
	srv := httptest.NewServer(Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"ok":true}`)
	})))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	req.Header.Set("Accept-Encoding", "gzip")
	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("status must survive, got %d", res.StatusCode)
	}
	if res.Header.Get("Content-Encoding") == "gzip" {
		t.Fatal("tiny responses must not be gzipped (waste)")
	}
	raw, _ := io.ReadAll(res.Body)
	if string(raw) != `{"ok":true}` {
		t.Fatalf("body corrupted: %q", raw)
	}
}

func TestGzip_NeverCompressesImages(t *testing.T) {
	srv := httptest.NewServer(Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write(make([]byte, 10000))
	})))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	req.Header.Set("Accept-Encoding", "gzip")
	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.Header.Get("Content-Encoding") == "gzip" {
		t.Fatal("already-compressed media must never be gzipped")
	}
}

func TestGzip_NeverBuffersSSEStream(t *testing.T) {
	srv := httptest.NewServer(Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "event: message.new\ndata: {\"x\":1}\n\n")
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		select { // hold the stream open a moment like a real SSE response
		case <-r.Context().Done():
		}
	})))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	req.Header.Set("Accept-Encoding", "gzip")
	ctx, cancel := context.WithTimeout(req.Context(), 1500*time.Millisecond)
	defer cancel()
	req = req.WithContext(ctx)

	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.Header.Get("Content-Encoding") == "gzip" {
		t.Fatal("SSE must never be gzipped/buffered")
	}
	buf := make([]byte, 64)
	n, _ := io.ReadFull(res.Body, buf[:min(34, len(buf))])
	if !strings.Contains(string(buf[:n]), "event:") {
		t.Fatalf("SSE event must flush through immediately, got %q", buf[:n])
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
