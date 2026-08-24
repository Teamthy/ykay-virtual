package domain

import (
	"errors"

	"github.com/google/uuid"
)

// Sentinel errors shared across the domain layer. Transport maps these to
// HTTP status codes via pkg/apierror — domain code never imports net/http.

var (
	ErrNotFound            = errors.New("resource not found")
	ErrConflict            = errors.New("resource state conflict")
	ErrInvalidInput        = errors.New("invalid input")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrTooManyRequests     = errors.New("too many requests")
	ErrAlreadyExists       = errors.New("resource already exists")
	ErrCapacityFull        = errors.New("capacity full")
	ErrNotPublished        = errors.New("resource not published")
	ErrInsufficientBalance = errors.New("insufficient wallet balance")
	ErrDuplicateWebhook    = errors.New("duplicate webhook")
	ErrInvalidSignature    = errors.New("invalid webhook signature")
)

// NotFoundErr wraps a sentinel with a resource type + id for structured logs.
func NotFoundErr(what string, id uuid.UUID) error {
	return &ResourceError{What: what, ID: id, Err: ErrNotFound}
}

type ResourceError struct {
	What string
	ID   uuid.UUID
	Err  error
}

func (e *ResourceError) Error() string { return e.What + " not found: " + e.ID.String() }
func (e *ResourceError) Unwrap() error { return e.Err }

// IsNotFound / IsConflict helpers for transport mapping.
func IsNotFound(err error) bool { return errors.Is(err, ErrNotFound) }
func IsConflict(err error) bool { return errors.Is(err, ErrConflict) }
func IsInvalid(err error) bool  { return errors.Is(err, ErrInvalidInput) }
