package ops

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// BootstrapOperators upserts named platform admins from env. No-op when
// OPERATOR_PASSWORD (or SEED_OPERATOR_PASSWORD) is empty. Password is never logged.
//
//	OPERATOR_ACADEMIC_EMAIL  → ACADEMIC_ADMIN
//	OPERATOR_SUPER_EMAIL     → SUPER_ADMIN
//	OPERATOR_PASSWORD        → shared password (min 8, letter + number)
func BootstrapOperators(db *sql.DB) error {
	if db == nil {
		return nil
	}
	pw := firstEnv("OPERATOR_PASSWORD", "SEED_OPERATOR_PASSWORD")
	academic := strings.ToLower(firstEnv("OPERATOR_ACADEMIC_EMAIL", "SEED_ACADEMIC_EMAIL"))
	super := strings.ToLower(firstEnv("OPERATOR_SUPER_EMAIL", "SEED_SUPER_EMAIL"))
	if pw == "" || (academic == "" && super == "") {
		return nil
	}
	if err := ValidatePassword(pw); err != nil {
		return fmt.Errorf("operator bootstrap: %w", err)
	}
	n := 0
	if academic != "" {
		if err := UpsertUser(db, academic, "ACADEMIC_ADMIN", pw); err != nil {
			return fmt.Errorf("operator bootstrap %s: %w", academic, err)
		}
		n++
		slog.Info("ops: academic admin ready", "email", academic)
	}
	if super != "" {
		if err := UpsertUser(db, super, "SUPER_ADMIN", pw); err != nil {
			return fmt.Errorf("operator bootstrap %s: %w", super, err)
		}
		n++
		slog.Info("ops: super admin ready", "email", super)
	}
	slog.Info("ops: operator accounts upserted", "count", n)
	return nil
}

func UpsertUser(db *sql.DB, email, role, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}
	var id string
	err = db.QueryRow(`
		INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
		VALUES ($1, $2, 'ACTIVE', 'Africa/Lagos', NOW(), NOW())
		ON CONFLICT (email) WHERE deleted_at IS NULL
		DO UPDATE SET
			password_hash = EXCLUDED.password_hash,
			status = 'ACTIVE',
			deleted_at = NULL,
			email_verified_at = NOW(),
			onboarded_at = NOW()
		RETURNING id::text`, email, string(hash)).Scan(&id)
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1::uuid, r.id FROM roles r WHERE r.name = $2
		ON CONFLICT (user_id, role_id) DO NOTHING`, id, role)
	return err
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	if len(password) > 72 {
		return fmt.Errorf("password must be at most 72 characters")
	}
	var letter, digit bool
	for _, r := range password {
		if unicode.IsLetter(r) {
			letter = true
		}
		if unicode.IsDigit(r) {
			digit = true
		}
	}
	if !letter || !digit {
		return fmt.Errorf("password must contain a letter and a number")
	}
	return nil
}

func firstEnv(keys ...string) string {
	for _, k := range keys {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return ""
}
