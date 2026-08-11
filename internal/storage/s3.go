package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type BucketType string

const (
	BucketPublic  BucketType = "public"
	BucketPrivate BucketType = "private"
)

type Storage interface {
	Upload(ctx context.Context, bucket BucketType, key string, data []byte, contentType string) error
	Delete(ctx context.Context, bucket BucketType, key string) error
	GeneratePresignedURL(ctx context.Context, bucket BucketType, key string, expiry time.Duration) (string, error)
	GetPublicURL(bucket BucketType, key string) string
}

// LocalStorage — disk-backed implementation for local development and tests.
// Presigned URLs are deterministic HMAC-signed tokens verified by the API's
// object-serving route (dev parity with S3 signed URLs). NOT for production —
// swap in MinioStorage (S3) via S3_* env vars.
type LocalStorage struct {
	Root    string
	BaseURL string
	secret  []byte
}

func NewLocalStorage() *LocalStorage {
	root := os.Getenv("YKAY_STORAGE_ROOT")
	if root == "" {
		root = filepath.Join(os.TempDir(), "ykay-storage")
	}
	return &LocalStorage{
		Root:    root,
		BaseURL: os.Getenv("YKAY_STORAGE_BASE_URL"), // e.g. http://localhost:8080
		secret:  []byte(os.Getenv("YKAY_STORAGE_SECRET")),
	}
}

func (s *LocalStorage) pathFor(bucket BucketType, key string) string {
	return filepath.Join(s.Root, string(bucket), filepath.FromSlash(key))
}

func (s *LocalStorage) Upload(_ context.Context, bucket BucketType, key string, data []byte, _ string) error {
	p := s.pathFor(bucket, key)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

func (s *LocalStorage) Delete(_ context.Context, bucket BucketType, key string) error {
	return os.Remove(s.pathFor(bucket, key))
}

// GeneratePresignedURL — deterministic HMAC-signed token (key, expiry, hmac)
// that the API validates before serving the object (server-side authz first).
func (s *LocalStorage) GeneratePresignedURL(_ context.Context, bucket BucketType, key string, expiry time.Duration) (string, error) {
	expires := time.Now().Add(expiry).Unix()
	sig := s.sign(key, expires)
	base := s.BaseURL
	if base == "" {
		base = "http://localhost:8080"
	}
	return fmt.Sprintf("%s/objects/%s/%s?expires=%d&sig=%s", base, bucket, url.PathEscape(key), expires, sig), nil
}

func (s *LocalStorage) sign(key string, expires int64) string {
	mac := hmac.New(sha256.New, s.secret)
	fmt.Fprintf(mac, "%s|%d", key, expires)
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

// VerifyPresignedToken — used by the dev object-serving route.
func (s *LocalStorage) VerifyPresignedToken(key string, expires int64, sig string) bool {
	if sig == "" || s.secret == nil {
		return false
	}
	if time.Now().Unix() > expires {
		return false
	}
	return hmac.Equal([]byte(s.sign(key, expires)), []byte(sig))
}

// GetPublicURL — stable CDN-style URL for public assets.
func (s *LocalStorage) GetPublicURL(bucket BucketType, key string) string {
	base := s.BaseURL
	if base == "" {
		base = "http://localhost:8080"
	}
	return fmt.Sprintf("%s/objects/%s/%s", base, bucket, strings.TrimPrefix(key, "/"))
}
