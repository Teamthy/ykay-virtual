package storage

import (
	"context"
	"strings"
	"testing"
	"time"
)

type fakeInner struct {
	uploaded map[string]int
}

func (f *fakeInner) Upload(_ context.Context, _ BucketType, key string, _ []byte, _ string) error {
	if f.uploaded == nil {
		f.uploaded = map[string]int{}
	}
	f.uploaded[key]++
	return nil
}
func (f *fakeInner) Delete(context.Context, BucketType, string) error { return nil }
func (f *fakeInner) GeneratePresignedURL(context.Context, BucketType, string, time.Duration) (string, error) {
	return "http://fake/", nil
}
func (f *fakeInner) GetPublicURL(BucketType, string) string { return "http://fake/" }

func TestUploadGuardRejectsBadMIMEAndOversize(t *testing.T) {
	inner := &fakeInner{}
	g := NewUploadGuard(inner, nil, 10<<20)

	// Oversize
	if err := g.GuardedUpload(context.Background(), BucketPrivate, "a.pdf", "application/pdf", 11<<20, []byte("x")); err == nil || !strings.Contains(err.Error(), "limit") {
		t.Errorf("oversize must be rejected, got %v", err)
	}
	// Bad MIME (executables are never accepted)
	if err := g.GuardedUpload(context.Background(), BucketPrivate, "evil.exe", "application/x-msdownload", 10, []byte("x")); err == nil || !strings.Contains(err.Error(), "not accepted") {
		t.Errorf("bad MIME must be rejected, got %v", err)
	}
	if len(inner.uploaded) != 0 {
		t.Fatalf("rejected uploads must not reach the store")
	}
	// Good MIME within limits
	if err := g.GuardedUpload(context.Background(), BucketPrivate, "id.pdf", "application/pdf", 10, []byte("x")); err != nil {
		t.Fatalf("valid upload failed: %v", err)
	}
	if inner.uploaded["id.pdf"] != 1 {
		t.Fatalf("valid upload must reach the store")
	}
}

func TestUploadGuardScannerHook(t *testing.T) {
	inner := &fakeInner{}
	g := NewUploadGuard(inner, []string{"image/png"}, 1<<20)
	scanned := ""
	g.SetScanner(func(_ context.Context, b BucketType, key string) { scanned = key })
	if err := g.GuardedUpload(context.Background(), BucketPrivate, "photo.png", "image/png", 5, []byte("x")); err != nil {
		t.Fatalf("upload: %v", err)
	}
	if scanned != "photo.png" {
		t.Fatalf("scanner hook not called, got %q", scanned)
	}
}

func TestUploadGuardQuarantineUnsupportedOnLocal(t *testing.T) {
	g := NewUploadGuard(NewLocalStorage(), nil, 1<<20)
	if err := g.Quarantine(context.Background(), BucketPrivate, "k", "scan"); err == nil {
		t.Fatal("quarantine on local storage must error (no quarantine bucket)")
	}
}

func TestSanitizeKey(t *testing.T) {
	if got := sanitizeKey("ClamAV: Win.Test.EICAR!!"); got != "clamav-win-test-eicar" {
		t.Errorf("sanitizeKey = %q", got)
	}
	if got := sanitizeKey("???"); got != "scan" {
		t.Errorf("empty sanitize → 'scan', got %q", got)
	}
}
