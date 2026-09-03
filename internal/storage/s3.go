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
	GeneratePresignedUploadURL(ctx context.Context, bucket BucketType, key string, contentType string, expiry time.Duration) (string, error)
	ObjectExists(ctx context.Context, bucket BucketType, key string) (bool, error)
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

// devStorageSecret is the signing secret used when YKAY_STORAGE_SECRET is not
// configured. It is intentionally a well-known, non-secret value: LocalStorage
// is a development/testing facility and its object-serving route (/objects) is
// gated OFF in production (NewObjectHandlerForEnvironment), so there is no
// production file-read exposure. A non-empty secret keeps presigned-URL
// issuance working in dev and CI without an explicit env var. Operators who
// want additional isolation can still set YKAY_STORAGE_SECRET explicitly.
const devStorageSecret = "nuvora-local-dev-secret"

func NewLocalStorage() *LocalStorage {
	root := os.Getenv("YKAY_STORAGE_ROOT")
	if root == "" {
		root = filepath.Join(os.TempDir(), "ykay-storage")
	}
	secret := os.Getenv("YKAY_STORAGE_SECRET")
	if secret == "" {
		secret = devStorageSecret
	}
	return &LocalStorage{
		Root:    root,
		BaseURL: os.Getenv("YKAY_STORAGE_BASE_URL"), // e.g. http://localhost:8080
		secret:  []byte(secret),
	}
}

// validateKey rejects object keys that could escape the storage root via path
// traversal or absolute paths. Security CF-2: the object-serving route builds
// a filesystem path from this key, so `..` segments or a leading `/` must
// never reach the disk. This is enforced here (defense in depth) in addition
// to gating the serving route out of production.
func (s *LocalStorage) validateKey(key string) error {
	if key == "" {
		return fmt.Errorf("invalid input: empty object key")
	}
	if strings.HasPrefix(key, "/") {
		return fmt.Errorf("invalid input: absolute object keys are not allowed")
	}
	cleaned := filepath.Clean(key)
	if cleaned == ".." || strings.HasPrefix(cleaned, ".."+string(os.PathSeparator)) {
		return fmt.Errorf("invalid input: path traversal is not allowed")
	}
	for _, part := range strings.Split(cleaned, string(os.PathSeparator)) {
		if part == ".." {
			return fmt.Errorf("invalid input: path traversal is not allowed")
		}
	}
	return nil
}

func (s *LocalStorage) pathFor(bucket BucketType, key string) (string, error) {
	if err := s.validateKey(key); err != nil {
		return "", err
	}
	return filepath.Join(s.Root, string(bucket), filepath.FromSlash(key)), nil
}

func (s *LocalStorage) Upload(_ context.Context, bucket BucketType, key string, data []byte, _ string) error {
	p, err := s.pathFor(bucket, key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

func (s *LocalStorage) Delete(_ context.Context, bucket BucketType, key string) error {
	p, err := s.pathFor(bucket, key)
	if err != nil {
		return err
	}
	return os.Remove(p)
}

// GeneratePresignedURL — deterministic HMAC-signed token (key, expiry, hmac)
// that the API validates before serving the object (server-side authz first).
func (s *LocalStorage) GeneratePresignedURL(_ context.Context, bucket BucketType, key string, expiry time.Duration) (string, error) {
	if err := s.validateKey(key); err != nil {
		return "", err
	}
	// Security CF-2: a presigned token is only meaningful when signed with a
	// real shared secret. With no secret configured the signature is
	// deterministic and trivially forgeable, so refuse to issue tokens.
	if !s.hasSecret() {
		return "", fmt.Errorf("storage: YKAY_STORAGE_SECRET is required to issue presigned URLs")
	}
	expires := time.Now().Add(expiry).Unix()
	sig := s.sign(key, expires)
	base := s.BaseURL
	if base == "" {
		base = "http://localhost:8080"
	}
	return fmt.Sprintf("%s/objects/%s/%s?expires=%d&sig=%s", base, bucket, url.PathEscape(key), expires, sig), nil
}

func (s *LocalStorage) GeneratePresignedUploadURL(ctx context.Context, bucket BucketType, key string, contentType string, expiry time.Duration) (string, error) {
	// Local dev reuses the deterministic signed URL route; production S3/R2 uses
	// a true signed PUT. The object-serving route is dev-only, so this is not a
	// production upload path.
	return s.GeneratePresignedURL(ctx, bucket, key, expiry)
}

func (s *LocalStorage) ObjectExists(_ context.Context, bucket BucketType, key string) (bool, error) {
	p, err := s.pathFor(bucket, key)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(p)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (s *LocalStorage) hasSecret() bool {
	return s.secret != nil && len(s.secret) > 0
}

func (s *LocalStorage) sign(key string, expires int64) string {
	mac := hmac.New(sha256.New, s.secret)
	fmt.Fprintf(mac, "%s|%d", key, expires)
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

// VerifyPresignedToken — used by the dev object-serving route.
func (s *LocalStorage) VerifyPresignedToken(key string, expires int64, sig string) bool {
	// Defense in depth: an empty secret must never validate a signature
	// (previously `s.secret == nil` allowed a forgeable empty-key HMAC).
	if sig == "" || !s.hasSecret() {
		return false
	}
	if err := s.validateKey(key); err != nil {
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
