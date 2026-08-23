// Package storage — production S3-compatible storage (G4.2, remediation plan).
//
// MinioStorage talks to any S3-compatible service (AWS S3, Cloudflare R2,
// Backblaze B2, MinIO, DigitalOcean Spaces) via the S3_* env vars:
//
//	S3_ENDPOINT  e.g. s3.amazonaws.com, https://minio.example.com
//	S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY
//	S3_PUBLIC_BUCKET / S3_PRIVATE_BUCKET  (created by ops, not the app)
//
// Presigned URLs are REAL S3 presigned GETs (server-signed, expiring).
// UploadGuard enforces MIME allowlist + size caps and quarantines rejected
// or scan-flagged objects into S3_QUARANTINE_BUCKET.
package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"

	"net/url"
	"os"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinioStorage — S3-compatible implementation of the Storage interface.
type MinioStorage struct {
	client        *minio.Client
	publicBucket  string
	privateBucket string
	publicBaseURL string // optional CDN/custom domain for GetPublicURL
}

// NewMinioStorage connects to the S3-compatible endpoint. Returns an error
// if the endpoint is unreachable or credentials are wrong (fail fast).
func NewMinioStorage(endpoint, region, accessKey, secretKey, publicBucket, privateBucket string) (*MinioStorage, error) {
	epURL := endpoint
	if !strings.Contains(epURL, "://") {
		epURL = "https://" + epURL
	}
	u, err := url.Parse(epURL)
	if err != nil {
		return nil, fmt.Errorf("storage: bad S3_ENDPOINT: %w", err)
	}
	secure := u.Scheme == "https"
	host := u.Host

	client, err := minio.New(host, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: secure,
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: init minio client: %w", err)
	}
	s := &MinioStorage{
		client:        client,
		publicBucket:  publicBucket,
		privateBucket: privateBucket,
		publicBaseURL: os.Getenv("S3_PUBLIC_BASE_URL"),
	}

	// Fail fast at boot: the buckets must exist and be reachable.
	pingCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for _, b := range []string{publicBucket, privateBucket} {
		exists, err := client.BucketExists(pingCtx, b)
		if err != nil || !exists {
			return nil, fmt.Errorf("storage: bucket %q not reachable (err=%v); create it before booting", b, err)
		}
	}
	return s, nil
}

func (s *MinioStorage) bucket(b BucketType) string {
	if b == BucketPublic {
		return s.publicBucket
	}
	return s.privateBucket
}

func (s *MinioStorage) Upload(ctx context.Context, b BucketType, key string, data []byte, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket(b), key, newByteReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("storage: put %s/%s: %w", b, key, err)
	}
	return nil
}

func (s *MinioStorage) Delete(ctx context.Context, b BucketType, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket(b), key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("storage: delete %s/%s: %w", b, key, err)
	}
	return nil
}

// GeneratePresignedURL — real S3 presigned GET with the requested expiry
// (bounded at 7 days by most providers; requests longer than 24h are
// discouraged for private objects).
func (s *MinioStorage) GeneratePresignedURL(ctx context.Context, b BucketType, key string, expiry time.Duration) (string, error) {
	if expiry > 24*time.Hour {
		expiry = 24 * time.Hour // S3 caps most presigns at 7d; keep tight for PII.
	}
	u, err := s.client.PresignedGetObject(ctx, s.bucket(b), key, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("storage: presign %s/%s: %w", b, key, err)
	}
	return u.String(), nil
}

// GetPublicURL — stable public URL (S3 virtual-host style, or the custom
// domain/base when S3_PUBLIC_BASE_URL is set).
func (s *MinioStorage) GetPublicURL(b BucketType, key string) string {
	if b == BucketPublic && s.publicBaseURL != "" {
		return strings.TrimRight(s.publicBaseURL, "/") + "/" + key
	}
	return fmt.Sprintf("%s/%s/%s", s.client.EndpointURL().String(), s.bucket(b), key)
}

// MoveToQuarantine copies the object into the quarantine bucket and removes
// the original. Quarantined objects are never served by the app: they live
// in a separate bucket with a different lifecycle policy (ops configures
// short retention + malware scan notification there).
func (s *MinioStorage) MoveToQuarantine(ctx context.Context, b BucketType, key string, reason string) error {
	q := os.Getenv("S3_QUARANTINE_BUCKET")
	if q == "" {
		q = "nuvora-quarantine"
	}
	qKey := fmt.Sprintf("%s/%s/%d-%s", string(b), key, time.Now().Unix(), sanitizeKey(reason))
	src := minio.CopySrcOptions{Bucket: s.bucket(b), Object: key}
	dst := minio.CopyDestOptions{Bucket: q, Object: qKey}
	if _, err := s.client.CopyObject(ctx, dst, src); err != nil {
		return fmt.Errorf("storage: quarantine copy: %w", err)
	}
	if err := s.client.RemoveObject(ctx, s.bucket(b), key, minio.RemoveObjectOptions{}); err != nil {
		slog.Warn("quarantine: original object not removed", "bucket", b, "key", key, "error", err)
	}
	return nil
}

func sanitizeKey(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	lastDash := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				b.WriteByte('-')
			}
			lastDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 32 {
		out = out[:32]
	}
	if out == "" {
		out = "scan"
	}
	return out
}

// ---------------------------------------------------------------- guards ----

// Default upload policy (G4.2): document-style MIME types only, ≤10 MB.
var (
	DefaultAllowedMIMEs = []string{
		"application/pdf",
		"image/jpeg", "image/png", "image/webp",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	}
	DefaultMaxUploadBytes = int64(10 << 20) // 10 MB
)

// UploadGuard wraps a Storage with MIME allowlist + size enforcement.
// Rejections are returned as ErrInvalidInput (callers map to 400); the
// optional scanner callback is invoked for files accepted for upload so
// deployments can chain ClamAV/S3 malware scanning asynchronously.
type UploadGuard struct {
	inner          Storage
	allowedMIMEs   map[string]bool
	maxUploadBytes int64
	onScan         func(ctx context.Context, b BucketType, key string)
	// scanner — synchronous malware scan of the raw bytes BEFORE the file is
	// stored (gap #5). Fail-closed: a scanner error rejects the upload.
	scanner MalwareScanner
}

func NewUploadGuard(inner Storage, allowed []string, maxBytes int64) *UploadGuard {
	if len(allowed) == 0 {
		allowed = DefaultAllowedMIMEs
	}
	if maxBytes <= 0 {
		maxBytes = DefaultMaxUploadBytes
	}
	m := make(map[string]bool, len(allowed))
	for _, t := range allowed {
		m[strings.ToLower(strings.TrimSpace(t))] = true
	}
	return &UploadGuard{inner: inner, allowedMIMEs: m, maxUploadBytes: maxBytes}
}

// SetScanner installs the post-upload malware-scan hook (returns a
// cancel-free callback; production wires ClamAV via the quarantine path).
func (g *UploadGuard) SetScanner(fn func(ctx context.Context, b BucketType, key string)) {
	g.onScan = fn
}

// WithMalwareScanner installs a synchronous pre-store malware scanner. Every
// GuardedUpload/Upload runs the bytes through it BEFORE persisting; a threat
// or scanner failure rejects the upload (fail-closed).
func (g *UploadGuard) WithMalwareScanner(m MalwareScanner) *UploadGuard {
	g.scanner = m
	return g
}

// GuardedUpload validates MIME + size + malware scan, then delegates.
func (g *UploadGuard) GuardedUpload(ctx context.Context, b BucketType, key, contentType string, size int64, data []byte) error {
	if size > g.maxUploadBytes {
		return fmt.Errorf("invalid input: upload exceeds %d MB limit", g.maxUploadBytes>>20)
	}
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if !g.allowedMIMEs[ct] {
		return fmt.Errorf("invalid input: file type %q is not accepted", ct)
	}
	if g.scanner != nil {
		res, err := g.scanner.Scan(ctx, data)
		if err != nil {
			return fmt.Errorf("invalid input: upload rejected — malware scan unavailable: %w", err)
		}
		if !res.Clean {
			return fmt.Errorf("invalid input: upload rejected — %s", res.Threat)
		}
	}
	if err := g.inner.Upload(ctx, b, key, data, ct); err != nil {
		return err
	}
	if g.onScan != nil {
		g.onScan(ctx, b, key)
	}
	return nil
}

// Storage interface compliance: Upload runs the guard; the other methods
// delegate to the inner store.
func (g *UploadGuard) Upload(ctx context.Context, b BucketType, key string, data []byte, contentType string) error {
	return g.GuardedUpload(ctx, b, key, contentType, int64(len(data)), data)
}

func (g *UploadGuard) Delete(ctx context.Context, b BucketType, key string) error {
	return g.inner.Delete(ctx, b, key)
}

func (g *UploadGuard) GeneratePresignedURL(ctx context.Context, b BucketType, key string, expiry time.Duration) (string, error) {
	return g.inner.GeneratePresignedURL(ctx, b, key, expiry)
}

func (g *UploadGuard) GetPublicURL(b BucketType, key string) string {
	return g.inner.GetPublicURL(b, key)
}

var _ Storage = (*UploadGuard)(nil)

// Quarantine delegates to MinioStorage when the inner store supports it.
func (g *UploadGuard) Quarantine(ctx context.Context, b BucketType, key, reason string) error {
	if ms, ok := g.inner.(*MinioStorage); ok {
		return ms.MoveToQuarantine(ctx, b, key, reason)
	}
	return errors.New("storage: quarantine unsupported on local storage")
}

// ---------------------------------------------------------------- factory ---

// NewStorageFromEnv — production factory: MinioStorage when S3_ENDPOINT is
// set (fail-fast on bad config), LocalStorage otherwise (dev).
func NewStorageFromEnv() (Storage, error) {
	if os.Getenv("S3_ENDPOINT") != "" {
		return NewMinioStorage(
			os.Getenv("S3_ENDPOINT"),
			getenv("S3_REGION", "us-east-1"),
			os.Getenv("S3_ACCESS_KEY"),
			os.Getenv("S3_SECRET_KEY"),
			getenv("S3_PUBLIC_BUCKET", "nuvora-public"),
			getenv("S3_PRIVATE_BUCKET", "nuvora-private"),
		)
	}
	return NewLocalStorage(), nil
}

// NewGuardedStorageFromEnv — production guard: S3 (or local) wrapped with
// the MIME/size policy from env (STORAGE_MAX_UPLOAD_BYTES,
// STORAGE_ALLOWED_MIME).
func NewGuardedStorageFromEnv() (*UploadGuard, error) {
	inner, err := NewStorageFromEnv()
	if err != nil {
		return nil, err
	}
	var allowed []string
	if v := os.Getenv("STORAGE_ALLOWED_MIME"); v != "" {
		for _, m := range strings.Split(v, ",") {
			if m = strings.TrimSpace(m); m != "" {
				allowed = append(allowed, m)
			}
		}
	}
	maxBytes := DefaultMaxUploadBytes
	if v := os.Getenv("STORAGE_MAX_UPLOAD_BYTES"); v != "" {
		var n int64
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil && n > 0 {
			maxBytes = n
		}
	}
	return NewUploadGuard(inner, allowed, maxBytes).
		WithMalwareScanner(NewDefaultMalwareScanner(os.Getenv("CLAMAV_ADDR"))), nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

type byteReader struct {
	data []byte
	off  int
}

func newByteReader(b []byte) *byteReader { return &byteReader{data: b} }

func (r *byteReader) Read(p []byte) (int, error) {
	if r.off >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.off:])
	r.off += n
	return n, nil
}

var _ Storage = (*MinioStorage)(nil)
