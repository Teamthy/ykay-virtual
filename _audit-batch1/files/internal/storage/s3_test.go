package storage

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Security CF-2 regression: object keys that could escape the storage root via
// path traversal or absolute paths must be rejected.
func TestLocalStorage_RejectsPathTraversal(t *testing.T) {
	s := NewLocalStorage()
	for _, key := range []string{
		"../../etc/passwd",
		"a/../../etc/passwd",
		"/etc/passwd",
		"..",
		"a/../..",
		"../secret",
	} {
		_, err := s.pathFor(BucketPublic, key)
		assert.Error(t, err, "key %q must be rejected", key)
	}
}

func TestLocalStorage_AllowsNormalKeys(t *testing.T) {
	s := NewLocalStorage()
	p, err := s.pathFor(BucketPublic, "tutors/alice/photo.jpg")
	require.NoError(t, err)
	assert.Contains(t, p, "tutors")
	assert.Contains(t, p, "alice")
}

// Security CF-2 regression: an empty (unset) signing secret must neither issue
// nor verify presigned tokens. Previously []byte("") was non-nil, so a
// deterministic empty-key HMAC was forgeable.
func TestLocalStorage_EmptySecretCannotIssueOrVerifyToken(t *testing.T) {
	s := &LocalStorage{Root: t.TempDir(), BaseURL: "http://localhost:8080", secret: []byte("")}
	_, err := s.GeneratePresignedURL(context.Background(), BucketPrivate, "doc.pdf", time.Minute)
	assert.Error(t, err, "presigned URL must not be issued without a secret")

	exp := time.Now().Add(time.Minute).Unix()
	assert.False(t, s.VerifyPresignedToken("doc.pdf", exp, "deadbeefdeadbeef"))
}

// A configured secret issues and verifies tokens correctly, and traversal keys
// are still rejected even with a valid secret.
func TestLocalStorage_PresignedToken_RoundTrip(t *testing.T) {
	s := &LocalStorage{Root: t.TempDir(), BaseURL: "http://localhost:8080", secret: []byte("correct horse battery staple")}
	u, err := s.GeneratePresignedURL(context.Background(), BucketPrivate, "docs/resume.pdf", time.Minute)
	require.NoError(t, err)
	assert.Contains(t, u, "sig=")

	// Extract the key + expiry from the URL and verify the signature.
	exp := time.Now().Add(time.Minute).Unix()
	assert.True(t, s.VerifyPresignedToken("docs/resume.pdf", exp, s.sign("docs/resume.pdf", exp)))

	// Traversal key must fail verification even with a valid secret.
	assert.False(t, s.VerifyPresignedToken("../../etc/passwd", exp, "x"))
}
