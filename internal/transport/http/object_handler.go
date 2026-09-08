package httpapi

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"ykay-virtual/internal/storage"
	"ykay-virtual/pkg"
)

// ObjectHandler — serves objects from LocalStorage for dev (signed URLs).
// Production uses S3/MinIO directly (storage.Storage interface) and this
// route stays disabled. Signatures are verified server-side; authz for
// private-bucket objects happens in the service layer BEFORE the URL is
// issued — this route only enforces the token (belt and braces).

type ObjectHandler struct {
	local *storage.LocalStorage
}

func NewObjectHandler(local *storage.LocalStorage) *ObjectHandler {
	return &ObjectHandler{local: local}
}

// NewObjectHandlerForEnvironment returns a handler that serves objects from
// LocalStorage in non-production environments, and nil in production. A nil
// handler means the router never mounts the /objects route in production
// (security CF-2: this is a development facility only; production serves
// objects from S3/MinIO directly, so exposing this route would be an
// unauthenticated file-read vector).
func NewObjectHandlerForEnvironment(local *storage.LocalStorage, environment string) *ObjectHandler {
	if strings.EqualFold(strings.TrimSpace(environment), "production") {
		return nil
	}
	return &ObjectHandler{local: local}
}

// resolveSignedTarget validates the bucket, key and presigned token shared
// by the GET (Serve) and PUT (Upload) dev object routes. It writes the error
// response and returns ok=false when the request must be rejected.
func (h *ObjectHandler) resolveSignedTarget(w http.ResponseWriter, r *http.Request) (storage.BucketType, string, bool) {
	if h.local == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "object storage not configured", nil)
		return "", "", false
	}
	bucket := storage.BucketType(r.PathValue("bucket"))
	if bucket != storage.BucketPublic && bucket != storage.BucketPrivate {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "invalid bucket", nil)
		return "", "", false
	}
	key := r.PathValue("key")
	// Defense in depth (security CF-2): reject traversal segments even if the
	// route were ever reachable; the token check alone must not be the only
	// line of defense against escaping the storage root.
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "invalid object key", nil)
		return "", "", false
	}
	expires, _ := strconv.ParseInt(r.URL.Query().Get("expires"), 10, 64)
	sig := r.URL.Query().Get("sig")
	if !h.local.VerifyPresignedToken(key, expires, sig) {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "invalid or expired signature", nil)
		return "", "", false
	}
	return bucket, key, true
}

func (h *ObjectHandler) Serve(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := h.resolveSignedTarget(w, r)
	if !ok {
		return
	}
	full := filepath.Join(h.local.Root, string(bucket), filepath.FromSlash(strings.TrimPrefix(key, "/")))
	data, err := os.ReadFile(full)
	if err != nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "object not found", nil)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// Upload receives a presigned PUT upload. LocalStorage issues its dev
// presigned UPLOAD URLs against this route (GeneratePresignedUploadURL
// reuses the signed-URL scheme); production uploads go straight to
// S3/MinIO and never reach here. Same token enforcement as Serve, plus a
// hard body cap so the dev route cannot be used to fill the disk.
func (h *ObjectHandler) Upload(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := h.resolveSignedTarget(w, r)
	if !ok {
		return
	}
	const maxUploadBytes = 25 << 20 // 25 MB — matches the vetting document cap
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "upload body too large or unreadable", nil)
		return
	}
	if err := h.local.Upload(r.Context(), bucket, key, data, r.Header.Get("Content-Type")); err != nil {
		pkg.WriteError(w, http.StatusInternalServerError, string(pkg.CodeInternal), "could not store object", nil)
		return
	}
	w.WriteHeader(http.StatusOK)
}
