package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

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

// DecodeJSON reads and strictly validates a JSON body into dst.
func DecodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return pkg.BadRequest("invalid JSON body", []pkg.ErrorDetail{{Message: err.Error()}})
	}
	return nil
}

// WriteAppError maps any error to the response envelope at the transport edge
// (typed errors → HTTP only here, per AGENTS.md).
func WriteAppError(w http.ResponseWriter, err error) {
	if appErr, ok := pkg.IsAppError(err); ok {
		pkg.WriteError(w, appErr.StatusCode, string(appErr.Code), appErr.Message, appErr.Details)
		return
	}
	switch {
	case isDomain(err, "not found"):
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "resource not found", nil)
	case isDomain(err, "conflict"):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), err.Error(), nil)
	case isDomain(err, "invalid"):
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), err.Error(), nil)
	case isDomain(err, "forbidden"):
		pkg.WriteError(w, http.StatusForbidden, string(pkg.CodeForbidden), "forbidden", nil)
	case isDomain(err, "capacity"):
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict), err.Error(), nil)
	case isDomain(err, "signature"):
		pkg.WriteError(w, http.StatusBadRequest, string(pkg.CodeBadRequest), "invalid webhook signature", nil)
	default:
		pkg.WriteError(w, http.StatusInternalServerError, string(pkg.CodeInternal), "internal server error", nil)
	}
}

func isDomain(err error, needle string) bool {
	return strings.Contains(strings.ToLower(err.Error()), needle)
}
