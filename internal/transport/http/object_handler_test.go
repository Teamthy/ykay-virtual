package httpapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/storage"
)

// Security CF-2 regression: the LocalStorage object-serving route must never be
// mounted in production. A nil handler keeps it unregistered in the router.
func TestObjectHandler_NotMountedInProduction(t *testing.T) {
	ls := storage.NewLocalStorage()
	assert.Nil(t, NewObjectHandlerForEnvironment(ls, "production"))
	assert.NotNil(t, NewObjectHandlerForEnvironment(ls, "development"))
	assert.NotNil(t, NewObjectHandlerForEnvironment(ls, "staging"))
}

// The dev presigned UPLOAD URL must be accepted by the PUT /objects route:
// tutor document uploads in memory/local mode go through this path, and the
// GET route alone used to leave the PUT with a 404.
func TestObjectHandler_PresignedPutUpload(t *testing.T) {
	t.Setenv("YKAY_STORAGE_ROOT", t.TempDir())
	t.Setenv("YKAY_STORAGE_SECRET", "test-secret")
	ls := storage.NewLocalStorage()

	uploadURL, err := ls.GeneratePresignedUploadURL(
		context.Background(), storage.BucketPrivate, "vetting/x/doc.pdf", "application/pdf", 60_000_000_000,
	)
	require.NoError(t, err)
	pu, err := url.Parse(uploadURL)
	require.NoError(t, err)

	h := NewObjectHandler(ls)
	mux := http.NewServeMux()
	mux.HandleFunc("PUT /objects/{bucket}/{key...}", h.Upload)
	mux.HandleFunc("GET /objects/{bucket}/{key...}", h.Serve)

	req := httptest.NewRequest(http.MethodPut, pu.Path+"?"+pu.RawQuery, strings.NewReader("national-id-bytes"))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, "presigned PUT stores the object")

	// The stored object is readable through the signed GET route.
	readURL, err := ls.GeneratePresignedURL(context.Background(), storage.BucketPrivate, "vetting/x/doc.pdf", 60_000_000_000)
	require.NoError(t, err)
	pr, err := url.Parse(readURL)
	require.NoError(t, err)
	greq := httptest.NewRequest(http.MethodGet, pr.Path+"?"+pr.RawQuery, nil)
	grec := httptest.NewRecorder()
	mux.ServeHTTP(grec, greq)
	require.Equal(t, http.StatusOK, grec.Code)
	assert.Equal(t, "national-id-bytes", grec.Body.String())

	// A forged signature is rejected.
	breq := httptest.NewRequest(http.MethodPut, pu.Path+"?expires="+pu.Query().Get("expires")+"&sig=forged", strings.NewReader("x"))
	brec := httptest.NewRecorder()
	mux.ServeHTTP(brec, breq)
	assert.Equal(t, http.StatusUnauthorized, brec.Code)
}
