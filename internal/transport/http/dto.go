package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// Shared request parsing per AGENTS.md: ?page, ?page_size, ?sort, ?filter[x].

type Pagination struct {
	Page     int
	PageSize int
	Sort     string
	Filters  map[string]string
}

const (
	MaxPageSize     = 100
	DefaultPageSize = 20
)

func ParsePagination(r *http.Request) Pagination {
	q := r.URL.Query()
	page := parseIntDefault(q.Get("page"), 1)
	if page < 1 {
		page = 1
	}
	pageSize := parseIntDefault(q.Get("page_size"), DefaultPageSize)
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}
	filters := map[string]string{}
	for key, vals := range q {
		if strings.HasPrefix(key, "filter[") && strings.HasSuffix(key, "]") && len(vals) > 0 && vals[0] != "" {
			filters[strings.TrimSuffix(strings.TrimPrefix(key, "filter["), "]")] = vals[0]
		}
	}
	return Pagination{Page: page, PageSize: pageSize, Sort: q.Get("sort"), Filters: filters}
}

func (p Pagination) Meta(total int64) *pkg.PaginationMeta {
	meta := pkg.NewPaginationMeta(p.Page, p.PageSize, total)
	return &meta
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

// ParseUUID reads a required UUID path/query param; returns a validation error.
func ParseUUID(r *http.Request, name string) (uuid.UUID, error) {
	v := r.PathValue(name)
	if v == "" {
		v = r.URL.Query().Get(name)
	}
	if v == "" {
		return uuid.Nil, pkg.BadRequest(name+" is required", nil)
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return uuid.Nil, pkg.BadRequest(name+" must be a valid UUID", []pkg.ErrorDetail{{Field: name, Message: "invalid UUID"}})
	}
	return id, nil
}

func ParseBoolPtr(s string) *bool {
	if s == "" {
		return nil
	}
	b, err := strconv.ParseBool(s)
	if err != nil {
		return nil
	}
	return &b
}

func ParseFloatPtr(s string) *float64 {
	if s == "" {
		return nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &f
}

// maxRequestBodyBytes bounds the size of a decoded JSON body. Requests larger
// than this are rejected before unbounded buffering can occur (perf/memory
// hardening — prevents oversized-payload abuse of the API).
const maxRequestBodyBytes = 1 << 20 // 1 MiB

// DecodeJSON reads and strictly validates a JSON body into dst.
func DecodeJSON(r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxRequestBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return pkg.BadRequest("invalid JSON body", []pkg.ErrorDetail{{Message: err.Error()}})
	}
	return nil
}

// sentinelMessage surfaces the specific reason a wrapped sentinel error
// carries ("unauthorized: invalid credentials" → "invalid credentials"),
// falling back to the generic text for a bare sentinel.
func sentinelMessage(err, sentinel error, fallback string) string {
	prefix := sentinel.Error() + ": "
	if msg := err.Error(); strings.HasPrefix(msg, prefix) {
		return msg[len(prefix):]
	}
	return fallback
}

// WriteAppError maps any error to the response envelope at the transport edge
// (typed errors → HTTP only here, per AGENTS.md). Sentinel errors are matched
// with errors.Is FIRST so messages like "invalid credentials" cannot be
// misrouted by substring matching.
func WriteAppError(w http.ResponseWriter, err error) {
	if appErr, ok := pkg.IsAppError(err); ok {
		pkg.WriteError(w, appErr.StatusCode, string(appErr.Code), appErr.Message, appErr.Details)
		return
	}
	switch {
	case errors.Is(err, domain.ErrUnauthorized):
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), sentinelMessage(err, domain.ErrUnauthorized, "unauthorized"), nil)
	case errors.Is(err, domain.ErrForbidden):
		pkg.WriteError(w, http.StatusForbidden, string(pkg.CodeForbidden), sentinelMessage(err, domain.ErrForbidden, "forbidden"), nil)
	case errors.Is(err, domain.ErrNotFound):
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), sentinelMessage(err, domain.ErrNotFound, "resource not found"), nil)
	case errors.Is(err, domain.ErrAlreadyExists):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), err.Error(), nil)
	case errors.Is(err, domain.ErrConflict), errors.Is(err, domain.ErrCapacityFull):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), err.Error(), nil)
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrInvalidSignature):
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), err.Error(), nil)
	case errors.Is(err, plus.ErrPremiumRequired):
		pkg.WriteError(w, http.StatusPaymentRequired, "PREMIUM_REQUIRED", err.Error(), nil)
	case errors.Is(err, domain.ErrTooManyRequests):
		pkg.WriteError(w, http.StatusTooManyRequests, string(pkg.CodeTooManyRequests), err.Error(), nil)
	case errors.Is(err, domain.ErrEmailDelivery):
		pkg.WriteError(w, http.StatusServiceUnavailable, "EMAIL_UNAVAILABLE",
			sentinelMessage(err, domain.ErrEmailDelivery, "email delivery is temporarily unavailable"), nil)
	default:
		// Log the real cause server-side (5xx visibility) without leaking it
		// to the client.
		slog.Error("internal error", "error", err)
		pkg.WriteError(w, http.StatusInternalServerError, string(pkg.CodeInternal), "internal server error", nil)
	}
}

// requireActor reads the session actor from context; returns nil
// (after writing 401) when no valid session is present. Actors can only
// come from the httpOnly session cookie (dev header bridge removed).
func requireActor(w http.ResponseWriter, r *http.Request) *middleware.Actor {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "authentication required", nil)
		return nil
	}
	return &actor
}
