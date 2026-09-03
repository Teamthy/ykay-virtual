package storage

import (
	"context"
	"fmt"
	"testing"
	"time"
)

// Upload malware scanning (gap #5): every upload through the UploadGuard is
// scanned BEFORE it is stored — not just avatars — and the guard fails closed
// when the scanner errors.

type memStore struct{ uploads int }

func (m *memStore) Upload(_ context.Context, _ BucketType, _ string, _ []byte, _ string) error {
	m.uploads++
	return nil
}
func (m *memStore) Delete(_ context.Context, _ BucketType, _ string) error { return nil }
func (m *memStore) GeneratePresignedURL(_ context.Context, _ BucketType, _ string, _ time.Duration) (string, error) {
	return "", nil
}
func (m *memStore) GeneratePresignedUploadURL(_ context.Context, _ BucketType, _ string, _ string, _ time.Duration) (string, error) {
	return "", nil
}
func (m *memStore) ObjectExists(_ context.Context, _ BucketType, _ string) (bool, error) {
	return true, nil
}
func (m *memStore) GetPublicURL(_ BucketType, _ string) string { return "" }

type errScanner struct{}

func (errScanner) Scan(_ context.Context, _ []byte) (*ScanResult, error) {
	return nil, fmt.Errorf("clamd down")
}

func TestUploadGuard_BlocksExecutableBeforeStore(t *testing.T) {
	inner := &memStore{}
	g := NewUploadGuard(inner, []string{"application/pdf"}, 1<<20).
		WithMalwareScanner(SignatureScanner{})

	// A Windows PE disguised as a PDF passes the MIME allowlist but must be
	// caught by the signature scan — and never reach the store.
	exe := append([]byte{'M', 'Z'}, make([]byte, 128)...)
	err := g.Upload(context.Background(), BucketType("resources"), "cv.pdf", exe, "application/pdf")
	if err == nil {
		t.Fatal("executable upload must be rejected")
	}
	if inner.uploads != 0 {
		t.Fatalf("rejected file reached the store (%d uploads)", inner.uploads)
	}
}

func TestUploadGuard_CleanFilePasses(t *testing.T) {
	inner := &memStore{}
	g := NewUploadGuard(inner, []string{"application/pdf"}, 1<<20).
		WithMalwareScanner(SignatureScanner{})

	pdf := append([]byte("%PDF-1.7\n"), []byte("hello curriculum")...)
	if err := g.Upload(context.Background(), BucketType("resources"), "notes.pdf", pdf, "application/pdf"); err != nil {
		t.Fatalf("clean upload rejected: %v", err)
	}
	if inner.uploads != 1 {
		t.Fatalf("clean file not stored")
	}
}

func TestUploadGuard_FailsClosedWhenScannerDown(t *testing.T) {
	inner := &memStore{}
	g := NewUploadGuard(inner, []string{"application/pdf"}, 1<<20).
		WithMalwareScanner(errScanner{})

	err := g.Upload(context.Background(), BucketType("resources"), "notes.pdf", []byte("%PDF-1.7"), "application/pdf")
	if err == nil {
		t.Fatal("scanner failure must reject the upload (fail-closed)")
	}
	if inner.uploads != 0 {
		t.Fatal("file stored despite scanner failure")
	}
}
