// Package logx configures YK-Virtual's structured logging (log/slog, A-20).
//
// Long-running services (API, worker) call Setup with their environment so
// production emits machine-readable JSON to stdout while local dev keeps
// human-readable text. Every log call site uses slog with key=value fields
// instead of printf-style messages so logs are aggregatable and searchable.
package logx

import (
	"log/slog"
	"os"
	"strings"
)

// Setup configures the process-wide logger and installs it as slog.Default().
// environment == "production" selects JSON output; anything else text.
// The level comes from LOG_LEVEL (debug|info|warn|error; default info).
func Setup(environment string) *slog.Logger {
	level := parseLevel(os.Getenv("LOG_LEVEL"))
	var handler slog.Handler
	if environment == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	}
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Fatal logs at error level and exits with status 1. It replaces log.Fatalf
// in boot paths where the process cannot continue (the standard logger's
// Fatalf cannot emit structured fields).
func Fatal(msg string, args ...any) {
	slog.Error(msg, args...)
	os.Exit(1)
}
