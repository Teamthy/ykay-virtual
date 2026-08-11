package pkg

import (
	"errors"
	"net/http"
)

type Code string

const (
	CodeBadRequest      Code = "BAD_REQUEST"
	CodeUnauthorized    Code = "UNAUTHORIZED"
	CodeForbidden       Code = "FORBIDDEN"
	CodeNotFound        Code = "NOT_FOUND"
	CodeConflict        Code = "CONFLICT"
	CodeValidationError Code = "VALIDATION_ERROR"
	CodeInternal        Code = "INTERNAL_ERROR"
	CodePaymentRequired Code = "PAYMENT_REQUIRED"
	CodeTooManyRequests Code = "TOO_MANY_REQUESTS"
)

type AppError struct {
	Code       Code
	Message    string
	Details    []ErrorDetail
	StatusCode int
	Err        error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewAppError(code Code, status int, message string) *AppError {
	return &AppError{Code: code, StatusCode: status, Message: message}
}

func BadRequest(msg string, details []ErrorDetail) *AppError {
	return &AppError{Code: CodeBadRequest, StatusCode: http.StatusBadRequest, Message: msg, Details: details}
}

func Unauthorized(msg string) *AppError {
	return &AppError{Code: CodeUnauthorized, StatusCode: http.StatusUnauthorized, Message: msg}
}

func Forbidden(msg string) *AppError {
	return &AppError{Code: CodeForbidden, StatusCode: http.StatusForbidden, Message: msg}
}

func NotFound(msg string) *AppError {
	return &AppError{Code: CodeNotFound, StatusCode: http.StatusNotFound, Message: msg}
}

func Conflict(msg string) *AppError {
	return &AppError{Code: CodeConflict, StatusCode: http.StatusConflict, Message: msg}
}

func Internal(err error) *AppError {
	return &AppError{Code: CodeInternal, StatusCode: http.StatusInternalServerError, Message: "internal server error", Err: err}
}

func IsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
